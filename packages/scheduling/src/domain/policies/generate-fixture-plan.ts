import { asEncounterId, type TeamId } from "@futrob/shared-kernel";
import {
  asFixtureRoundId,
  asFixtureStageId,
  type FixtureEncounter,
  type FixtureGenerationSpec,
  type FixtureParticipantSlot,
  type FixturePlan,
  type FixtureRound,
  type FixtureStage,
  type FixtureStageId,
} from "../entities/fixture-plan.ts";

interface GeneratedStage {
  readonly stage: FixtureStage;
  readonly nextRoundOffset: number;
}

type Pairing = readonly [FixtureParticipantSlot, FixtureParticipantSlot];
type RoundPairings = readonly Pairing[];

export function fixtureGenerationKey(input: {
  readonly competitionId: string;
  readonly rulesVersion: number;
  readonly generationVersion: number;
}): string {
  return `${input.competitionId}:rules:${input.rulesVersion}:generation:${input.generationVersion}`;
}

export function generateFixturePlan(spec: FixtureGenerationSpec): FixturePlan {
  const generationKey = fixtureGenerationKey(spec);
  const planId = `${generationKey}:fixture`;
  const common = { spec, planId };
  let stages: readonly FixtureStage[];

  switch (spec.format) {
    case "league":
      stages = [
        generateLeagueStage({
          ...common,
          kind: "league",
          participantsByGroup: [spec.seed],
          stageOrder: 1,
          roundOffset: 0,
          homeAndAway: spec.homeAndAway,
        }).stage,
      ];
      break;
    case "knockout":
      stages = [
        generateKnockoutStage({
          ...common,
          kind: "knockout",
          slots: spec.seed.map(teamSlot),
          stageOrder: 1,
          roundOffset: 0,
        }).stage,
      ];
      break;
    case "groups-knockout": {
      const groups = distributeGroups(spec.seed, spec.groups?.count ?? 0);
      const groupStage = generateLeagueStage({
        ...common,
        kind: "groups",
        participantsByGroup: groups,
        stageOrder: 1,
        roundOffset: 0,
        homeAndAway: spec.homeAndAway,
      });
      const knockoutSlots = groupRankingSlots(
        groupStage.stage.id,
        groups.length,
        spec.groups?.qualifiersPerGroup ?? 0,
      );
      const knockoutStage = generateKnockoutStage({
        ...common,
        kind: "knockout",
        slots: knockoutSlots,
        stageOrder: 2,
        roundOffset: groupStage.nextRoundOffset,
      });
      stages = [groupStage.stage, knockoutStage.stage];
      break;
    }
    case "league-playoffs": {
      const leagueStage = generateLeagueStage({
        ...common,
        kind: "league",
        participantsByGroup: [spec.seed],
        stageOrder: 1,
        roundOffset: 0,
        homeAndAway: spec.homeAndAway,
      });
      const playoffCount = spec.playoffs?.teamCount ?? 0;
      const playoffSlots = Array.from({ length: playoffCount }, (_, index) => ({
        kind: "stage-rank" as const,
        stageId: leagueStage.stage.id,
        rank: index + 1,
      }));
      const playoffStage = generateKnockoutStage({
        ...common,
        kind: "playoffs",
        slots: playoffSlots,
        stageOrder: 2,
        roundOffset: leagueStage.nextRoundOffset,
      });
      stages = [leagueStage.stage, playoffStage.stage];
      break;
    }
  }

  return {
    id: planId,
    generationKey,
    organizationId: spec.organizationId,
    competitionId: spec.competitionId,
    rulesVersion: spec.rulesVersion,
    generationVersion: spec.generationVersion,
    format: spec.format,
    timeZone: spec.timeZone,
    seed: [...spec.seed],
    stages,
  };
}

function generateLeagueStage(input: {
  readonly spec: FixtureGenerationSpec;
  readonly planId: string;
  readonly kind: "league" | "groups";
  readonly participantsByGroup: readonly (readonly TeamId[])[];
  readonly stageOrder: number;
  readonly roundOffset: number;
  readonly homeAndAway: boolean;
}): GeneratedStage {
  const stageId = asFixtureStageId(`${input.planId}:stage:${input.stageOrder}`);
  const schedules = input.participantsByGroup.map(roundRobin);
  const firstLegRounds = Math.max(...schedules.map((schedule) => schedule.length));
  const legCount = input.homeAndAway ? 2 : 1;
  const rounds: FixtureRound[] = [];

  for (let leg = 0; leg < legCount; leg += 1) {
    for (let roundIndex = 0; roundIndex < firstLegRounds; roundIndex += 1) {
      const number = leg * firstLegRounds + roundIndex + 1;
      const roundId = asFixtureRoundId(`${stageId}:round:${number}`);
      const scheduledStartAt = roundStart(input.spec, input.roundOffset + number - 1);
      const encounters: FixtureEncounter[] = [];
      for (let groupIndex = 0; groupIndex < schedules.length; groupIndex += 1) {
        const groupId = input.kind === "groups" ? groupName(groupIndex) : undefined;
        const pairings = schedules[groupIndex]?.[roundIndex] ?? [];
        for (const pairing of pairings) {
          const [home, away] = leg === 0 ? pairing : [pairing[1], pairing[0]];
          encounters.push(
            fixtureEncounter({
              spec: input.spec,
              stageId,
              roundId,
              order: encounters.length + 1,
              groupId,
              home,
              away,
              scheduledStartAt,
              officialMatchCount: input.spec.officialMatchCounts.regular,
            }),
          );
        }
      }
      rounds.push({ id: roundId, stageId, number, scheduledStartAt, encounters });
    }
  }

  return {
    stage: { id: stageId, kind: input.kind, order: input.stageOrder, rounds },
    nextRoundOffset: input.roundOffset + rounds.length,
  };
}

function generateKnockoutStage(input: {
  readonly spec: FixtureGenerationSpec;
  readonly planId: string;
  readonly kind: "knockout" | "playoffs";
  readonly slots: readonly FixtureParticipantSlot[];
  readonly stageOrder: number;
  readonly roundOffset: number;
}): GeneratedStage {
  const stageId = asFixtureStageId(`${input.planId}:stage:${input.stageOrder}`);
  const bracketSize = nextPowerOfTwo(input.slots.length);
  let slots = [
    ...input.slots,
    ...Array.from({ length: bracketSize - input.slots.length }, byeSlot),
  ];
  const rounds: FixtureRound[] = [];

  for (let roundIndex = 0; slots.length > 1; roundIndex += 1) {
    const number = roundIndex + 1;
    const roundId = asFixtureRoundId(`${stageId}:round:${number}`);
    const scheduledStartAt = roundStart(input.spec, input.roundOffset + roundIndex);
    const encounters: FixtureEncounter[] = [];
    const firstRound = roundIndex === 0;
    const pairingCount = slots.length / 2;

    for (let index = 0; index < pairingCount; index += 1) {
      const home = slots[index] ?? byeSlot();
      const away = firstRound
        ? (slots[slots.length - 1 - index] ?? byeSlot())
        : (slots[index + pairingCount] ?? byeSlot());
      encounters.push(
        fixtureEncounter({
          spec: input.spec,
          stageId,
          roundId,
          order: index + 1,
          home,
          away,
          scheduledStartAt,
          officialMatchCount: input.spec.officialMatchCounts.knockout,
        }),
      );
    }
    rounds.push({ id: roundId, stageId, number, scheduledStartAt, encounters });
    slots = encounters.map((encounter) => ({
      kind: "winner" as const,
      encounterId: encounter.id,
    }));
  }

  return {
    stage: { id: stageId, kind: input.kind, order: input.stageOrder, rounds },
    nextRoundOffset: input.roundOffset + rounds.length,
  };
}

function fixtureEncounter(input: {
  readonly spec: FixtureGenerationSpec;
  readonly stageId: FixtureStageId;
  readonly roundId: ReturnType<typeof asFixtureRoundId>;
  readonly order: number;
  readonly groupId?: string;
  readonly home: FixtureParticipantSlot;
  readonly away: FixtureParticipantSlot;
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
}): FixtureEncounter {
  return {
    id: asEncounterId(`${input.roundId}:encounter:${input.order}`),
    stageId: input.stageId,
    roundId: input.roundId,
    order: input.order,
    ...(input.groupId ? { groupId: input.groupId } : {}),
    home: input.home,
    away: input.away,
    scheduledStartAt: input.scheduledStartAt,
    officialMatchCount: input.officialMatchCount,
  };
}

function roundRobin(participants: readonly TeamId[]): readonly RoundPairings[] {
  const slots: FixtureParticipantSlot[] = participants.map(teamSlot);
  if (slots.length % 2 === 1) slots.push(byeSlot());
  const rounds: Pairing[][] = [];
  let rotation = slots;

  for (let round = 0; round < slots.length - 1; round += 1) {
    const pairings: Pairing[] = [];
    for (let index = 0; index < slots.length / 2; index += 1) {
      const left = rotation[index] ?? byeSlot();
      const right = rotation[rotation.length - 1 - index] ?? byeSlot();
      pairings.push((round + index) % 2 === 0 ? [left, right] : [right, left]);
    }
    rounds.push(pairings);
    rotation = [rotation[0] ?? byeSlot(), rotation.at(-1) ?? byeSlot(), ...rotation.slice(1, -1)];
  }
  return rounds;
}

function distributeGroups(seed: readonly TeamId[], count: number): readonly (readonly TeamId[])[] {
  const groups = Array.from({ length: count }, () => [] as TeamId[]);
  seed.forEach((teamId, index) => groups[index % count]?.push(teamId));
  return groups;
}

function groupRankingSlots(
  stageId: FixtureStageId,
  groupCount: number,
  qualifiersPerGroup: number,
): FixtureParticipantSlot[] {
  const slots: FixtureParticipantSlot[] = [];
  for (let rank = 1; rank <= qualifiersPerGroup; rank += 1) {
    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
      slots.push({ kind: "group-rank", stageId, groupId: groupName(groupIndex), rank });
    }
  }
  return slots;
}

function teamSlot(teamId: TeamId): FixtureParticipantSlot {
  return { kind: "team", teamId };
}

function byeSlot(): FixtureParticipantSlot {
  return { kind: "bye" };
}

function groupName(index: number): string {
  return `group-${index + 1}`;
}

function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

function roundStart(spec: FixtureGenerationSpec, roundOffset: number): Date {
  const start = zonedParts(spec.startsAt, spec.timeZone);
  const localCalendar = new Date(
    Date.UTC(
      start.year,
      start.month - 1,
      start.day + roundOffset * spec.roundIntervalDays,
      start.hour,
      start.minute,
      start.second,
    ),
  );
  return instantForZonedParts(
    {
      year: localCalendar.getUTCFullYear(),
      month: localCalendar.getUTCMonth() + 1,
      day: localCalendar.getUTCDate(),
      hour: localCalendar.getUTCHours(),
      minute: localCalendar.getUTCMinutes(),
      second: localCalendar.getUTCSeconds(),
    },
    spec.timeZone,
  );
}

interface ZonedParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function instantForZonedParts(desired: ZonedParts, timeZone: string): Date {
  const desiredAsUtc = partsAsUtc(desired);
  let candidate = desiredAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = zonedParts(new Date(candidate), timeZone);
    const difference = desiredAsUtc - partsAsUtc(observed);
    if (difference === 0) break;
    candidate += difference;
  }
  return new Date(candidate);
}

function partsAsUtc(parts: ZonedParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}
