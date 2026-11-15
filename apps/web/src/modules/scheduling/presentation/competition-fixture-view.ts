import type {
  FixtureEncounterDto,
  FixtureParticipantSlotDto,
  FixturePlanDto,
  FixtureStageDto,
  GetCurrentCompetitionFixtureResponse,
} from "@futrob/api-contracts";

export type FixtureStageKind = FixtureStageDto["kind"];

/** How a round reads: league and group rounds are matchdays, knockout rounds shrink to a final. */
export type FixtureRoundName =
  | { readonly kind: "matchday"; readonly number: number }
  | { readonly kind: "final" | "semifinal" | "quarterfinal" | "roundOf16" }
  | { readonly kind: "round"; readonly number: number };

/** Who fills one side of an Encounter, as far as the fixture knows today. */
export type FixtureSide =
  | {
      readonly kind: "team";
      readonly teamId: string;
      readonly name: string | null;
      /** Swiss only: left out of later pairings; earlier results still count. */
      readonly withdrawn: boolean;
    }
  | { readonly kind: "bye" }
  | {
      readonly kind: "winner";
      /** The Encounter whose winner advances; null if it is not in this fixture. */
      readonly from: { readonly round: FixtureRoundName; readonly order: number } | null;
    }
  | { readonly kind: "groupRank"; readonly group: string; readonly rank: number }
  | { readonly kind: "stageRank"; readonly stage: FixtureStageKind; readonly rank: number };

/** A bye and a closed encounter have no Encounter page, so they never read as a link. */
export type FixtureEncounterKind = "match" | "bye" | "closed";

export type FixtureEncounterView = {
  readonly id: string;
  readonly kind: FixtureEncounterKind;
  readonly group: string | null;
  readonly scheduledStartAt: string;
  readonly officialMatchCount: 1 | 2;
  readonly home: FixtureSide;
  readonly away: FixtureSide;
};

export type FixtureRoundView = {
  readonly id: string;
  readonly name: FixtureRoundName;
  readonly number: number;
  readonly scheduledStartAt: string;
  readonly encounters: readonly FixtureEncounterView[];
};

export type FixtureStageView = {
  readonly id: string;
  readonly kind: FixtureStageKind;
  readonly rounds: readonly FixtureRoundView[];
};

export type SwissFixtureTeam = { readonly teamId: string; readonly name: string | null };

/**
 * What the plan alone says about a Swiss fixture. It knows which rounds are paired, not which
 * results are official: rounds only pair once the previous one settled, so the last paired round
 * is the one being played unless the competition is over.
 */
export type SwissFixtureView = {
  readonly fixturePlanId: string;
  readonly roundsTotal: number;
  readonly roundsPaired: number;
  readonly currentRoundNumber: number | null;
  readonly withdrawable: readonly SwissFixtureTeam[];
  readonly withdrawn: readonly SwissFixtureTeam[];
};

export type CompetitionFixtureView = {
  readonly timeZone: string;
  readonly stages: readonly FixtureStageView[];
  /** Null in every other format. */
  readonly swiss: SwissFixtureView | null;
};

/** Null until the competition has a fixture. */
export function competitionFixtureView(
  response: GetCurrentCompetitionFixtureResponse,
): CompetitionFixtureView | null {
  const { fixture } = response;
  if (!fixture) return null;
  const names = new Map(response.teams.map((team) => [team.teamId, team.name]));
  const withdrawnIds = new Set(fixture.withdrawnTeamIds ?? []);
  const stages = sortedBy(fixture.stages, (stage) => stage.order);
  const stageKinds = new Map(stages.map((stage) => [stage.id, stage.kind]));
  const positions = new Map<string, { round: FixtureRoundName; order: number }>();
  const rounds = new Map(
    stages.map((stage) => [
      stage.id,
      sortedBy(stage.rounds, (round) => round.number).map((round) => {
        const name = roundName(stage.kind, round.number, round.encounters.length);
        for (const encounter of round.encounters) {
          positions.set(encounter.id, { round: name, order: encounter.order });
        }
        return { round, name };
      }),
    ]),
  );

  const side = (slot: FixtureParticipantSlotDto): FixtureSide => {
    switch (slot.kind) {
      case "team":
        return {
          kind: "team",
          teamId: slot.teamId,
          name: names.get(slot.teamId) ?? null,
          withdrawn: withdrawnIds.has(slot.teamId),
        };
      case "bye":
        return { kind: "bye" };
      case "winner":
        return { kind: "winner", from: positions.get(slot.encounterId) ?? null };
      case "group-rank":
        return { kind: "groupRank", group: groupLabel(slot.groupId), rank: slot.rank };
      case "stage-rank":
        return {
          kind: "stageRank",
          stage: stageKinds.get(slot.stageId) ?? "league",
          rank: slot.rank,
        };
      default: {
        const exhaustive: never = slot;
        return exhaustive;
      }
    }
  };

  return {
    timeZone: fixture.timeZone,
    stages: stages.map((stage) => ({
      id: stage.id,
      kind: stage.kind,
      rounds: (rounds.get(stage.id) ?? []).map(({ round, name }) => ({
        id: round.id,
        name,
        number: round.number,
        scheduledStartAt: round.scheduledStartAt,
        encounters: sortedBy(round.encounters, (encounter) => encounter.order).map((encounter) => ({
          id: encounter.id,
          kind: encounterKind(encounter),
          group: encounter.groupId ? groupLabel(encounter.groupId) : null,
          scheduledStartAt: encounter.scheduledStartAt,
          officialMatchCount: encounter.officialMatchCount,
          home: side(encounter.home),
          away: side(encounter.away),
        })),
      })),
    })),
    swiss: fixture.format === "swiss" ? swissView(fixture, names, withdrawnIds) : null,
  };
}

function encounterKind(encounter: FixtureEncounterDto): FixtureEncounterKind {
  if (encounter.home.kind === "bye" || encounter.away.kind === "bye") return "bye";
  return encounter.closedWithoutResult ? "closed" : "match";
}

function swissView(
  fixture: FixturePlanDto,
  names: ReadonlyMap<string, string>,
  withdrawnIds: ReadonlySet<string>,
): SwissFixtureView {
  const rounds = fixture.stages.flatMap((stage) => stage.rounds);
  const paired = rounds.filter((round) => round.encounters.length > 0);
  const team = (teamId: string): SwissFixtureTeam => ({
    teamId,
    name: names.get(teamId) ?? null,
  });
  return {
    fixturePlanId: fixture.id,
    roundsTotal: rounds.length,
    roundsPaired: paired.length,
    currentRoundNumber: paired.length > 0 ? Math.max(...paired.map((round) => round.number)) : null,
    withdrawable: fixture.seed.filter((teamId) => !withdrawnIds.has(teamId)).map(team),
    withdrawn: fixture.seed.filter((teamId) => withdrawnIds.has(teamId)).map(team),
  };
}

function roundName(kind: FixtureStageKind, number: number, size: number): FixtureRoundName {
  if (kind === "league" || kind === "groups") return { kind: "matchday", number };
  // A Swiss round keeps its number: its size says nothing about how far the stage has gone.
  if (kind === "swiss") return { kind: "round", number };
  switch (size) {
    case 1:
      return { kind: "final" };
    case 2:
      return { kind: "semifinal" };
    case 4:
      return { kind: "quarterfinal" };
    case 8:
      return { kind: "roundOf16" };
    default:
      return { kind: "round", number };
  }
}

function sortedBy<T>(items: readonly T[], rank: (item: T) => number): T[] {
  return [...items].sort((left, right) => rank(left) - rank(right));
}

/** The generator names groups `group-1`, `group-2`…; readers know them as A, B… */
function groupLabel(groupId: string): string {
  const index = /^group-(\d+)$/.exec(groupId)?.[1];
  const number = index ? Number(index) : Number.NaN;
  return number >= 1 && number <= 26 ? String.fromCodePoint(64 + number) : groupId;
}
