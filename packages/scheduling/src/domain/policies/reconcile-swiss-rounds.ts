import {
  asEncounterId,
  asOfficialMatchSlotId,
  compareTime,
  MS_PER_DAY,
  type EncounterId,
  type TeamId,
} from "@futrob/shared-kernel";
import type {
  FixtureEncounter,
  FixtureParticipantSlot,
  FixturePlan,
  FixtureRound,
  FixtureRoundId,
  SeriesResolutionMode,
} from "../entities/fixture-plan.ts";
import type { OfficialEncounterScore } from "../ports/official-encounter-score-reader.port.ts";
import { planEncounters } from "./edit-fixture-encounter.ts";
import { pairSwissRound, type SwissTable } from "./pair-swiss-round.ts";
import type { StandingPoints } from "./reconcile-fixture-advancement.ts";
import {
  isSwissEncounterSettled,
  isSwissRoundSettled,
  swissByeTeam,
  swissPairingPoints,
  swissRounds,
} from "./swiss-standing-points.ts";
import { addZonedDays } from "./zoned-instant.ts";

export interface ReconcileSwissRoundsInput {
  readonly plan: FixturePlan;
  readonly scores: ReadonlyMap<EncounterId, OfficialEncounterScore>;
  readonly standingPoints: StandingPoints;
  readonly officialMatchCount: 1 | 2;
  readonly resolutionMode: SeriesResolutionMode;
  readonly now: Date;
}

export type SwissRoundChange =
  | { readonly kind: "none" }
  /** `after` is the bye for the rival, or null when the encounter is removed. */
  | {
      readonly kind: "forfeit";
      readonly round: FixtureRound;
      readonly before: FixtureEncounter;
      readonly after: FixtureEncounter | null;
    }
  | { readonly kind: "unpair"; readonly rounds: readonly FixtureRound[] }
  | { readonly kind: "pair"; readonly round: FixtureRound }
  | { readonly kind: "truncate"; readonly roundIds: readonly FixtureRoundId[] };

/**
 * The single next change the plan needs (ADR-0027, section 1). It depends only on current state:
 * applying each change and asking again converges on `none`, so a repeat finds nothing to do.
 */
export function reconcileSwissRounds(input: ReconcileSwissRoundsInput): SwissRoundChange {
  const { plan, scores } = input;
  const rounds = swissRounds(plan);
  const hasResult = (encounterId: EncounterId) => scores.has(encounterId);

  const forfeit = nextForfeit(plan, rounds, hasResult);
  if (forfeit) return forfeit;

  const lastPaired = rounds.map((round) => round.encounters.length > 0).lastIndexOf(true);
  // A round emptied by removals before a paired one is a hole: what follows it must be paired again.
  const open = rounds.findIndex(
    (round, index) => index <= lastPaired && !isSwissRoundSettled(round, hasResult),
  );
  if (open !== -1) {
    const later = rounds.slice(open + 1).filter((round) => round.encounters.length > 0);
    return later.length > 0 ? { kind: "unpair", rounds: later } : { kind: "none" };
  }

  const next = rounds.find((round) => round.encounters.length === 0);
  if (!next) return { kind: "none" };

  const pairing = pairSwissRound({
    seed: plan.seed,
    withdrawnTeamIds: plan.withdrawnTeamIds ?? [],
    points: swissPairingPoints(plan, scores, input),
    encounters: [...planEncounters(plan)],
  });
  if (pairing.kind === "exhausted") {
    return {
      kind: "truncate",
      roundIds: rounds.filter((round) => round.encounters.length === 0).map((round) => round.id),
    };
  }
  const scheduledStartAt = rollForwardWholeDays(next.scheduledStartAt, plan.timeZone, input.now);
  return {
    kind: "pair",
    round: {
      ...next,
      encounters: swissRoundEncounters({
        round: next,
        revision: plan.revision,
        tables: pairing.tables,
        scheduledStartAt,
        officialMatchCount: input.officialMatchCount,
        resolutionMode: input.resolutionMode,
      }),
    },
  };
}

function nextForfeit(
  plan: FixturePlan,
  rounds: readonly FixtureRound[],
  hasResult: (encounterId: EncounterId) => boolean,
): SwissRoundChange | null {
  const withdrawn = new Set(plan.withdrawnTeamIds ?? []);
  if (withdrawn.size === 0) return null;
  const isWithdrawn = (slot: FixtureParticipantSlot) =>
    slot.kind === "team" && withdrawn.has(slot.teamId);
  const lastPaired = rounds.filter((round) => round.encounters.length > 0).at(-1);

  for (const round of rounds) {
    for (const before of round.encounters) {
      if (swissByeTeam(before) !== null) {
        // A bye of a settled round is history. Only a round still being played can lose it.
        const stillPlaying =
          round === lastPaired &&
          round.encounters.some((other) => !isSwissEncounterSettled(other, hasResult));
        if (stillPlaying && (isWithdrawn(before.home) || isWithdrawn(before.away))) {
          return { kind: "forfeit", round, before, after: null };
        }
        continue;
      }
      if (isSwissEncounterSettled(before, hasResult)) continue;
      const { home, away } = before;
      if (!isWithdrawn(home) && !isWithdrawn(away)) continue;
      const rival = isWithdrawn(home) ? away : home;
      return {
        kind: "forfeit",
        round,
        before,
        after: isWithdrawn(rival)
          ? null
          : { ...before, home: rival, away: { kind: "bye" }, series: null },
      };
    }
  }
  return null;
}

/** Ids carry the plan revision: results tables have no foreign key to the encounter, so reusing an
 * id after unpairing would inherit the previous pairing's selection and candidates. */
export function swissRoundEncounters(input: {
  readonly round: Pick<FixtureRound, "id" | "stageId">;
  readonly revision: number;
  readonly tables: readonly SwissTable[];
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
  readonly resolutionMode: SeriesResolutionMode;
}): readonly FixtureEncounter[] {
  return input.tables.map((table, index) => {
    const order = index + 1;
    const id = asEncounterId(`${input.round.id}:encounter:${order}:p${input.revision}`);
    const home: FixtureParticipantSlot = { kind: "team", teamId: table.home };
    const slots: readonly (1 | 2)[] = input.officialMatchCount === 1 ? [1] : [1, 2];
    return {
      id,
      stageId: input.round.stageId,
      roundId: input.round.id,
      order,
      home,
      away: table.away === null ? { kind: "bye" } : teamSlot(table.away),
      scheduledStartAt: input.scheduledStartAt,
      officialMatchCount: input.officialMatchCount,
      series:
        table.away === null
          ? null
          : {
              id: `${id}:series`,
              resolutionMode: input.resolutionMode,
              officialMatches: slots.map((slot) => ({
                id: asOfficialMatchSlotId(`${id}:official-match:${slot}`),
                slot,
              })),
            },
    };
  });
}

function teamSlot(teamId: TeamId): FixtureParticipantSlot {
  return { kind: "team", teamId };
}

/** Keeps the local time of `scheduled`, moved whole days forward until it is after `now`. */
export function rollForwardWholeDays(scheduled: Date, timeZone: string, now: Date): Date {
  if (compareTime(scheduled, now) > 0) return scheduled;
  let days = Math.floor(compareTime(now, scheduled) / MS_PER_DAY);
  let candidate = addZonedDays(scheduled, days, timeZone);
  while (compareTime(candidate, now) <= 0) {
    days += 1;
    candidate = addZonedDays(scheduled, days, timeZone);
  }
  return candidate;
}
