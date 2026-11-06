import type { EncounterId, TeamId } from "@futrob/shared-kernel";
import type {
  FixtureEncounter,
  FixturePlan,
  FixtureRound,
  SeriesResolutionMode,
} from "../entities/fixture-plan.ts";
import type { OfficialEncounterScore } from "../ports/official-encounter-score-reader.port.ts";
import { planEncounters } from "./edit-fixture-encounter.ts";
import type { StandingPoints } from "./reconcile-fixture-advancement.ts";

export interface SwissPointsRules {
  readonly standingPoints: StandingPoints;
  readonly officialMatchCount: 1 | 2;
  readonly resolutionMode: SeriesResolutionMode;
}

/** A bye is worth a win over the whole encounter (ADR-0027, section 3). */
export function swissPointsPerBye(rules: SwissPointsRules): number {
  const { winPoints } = rules.standingPoints;
  return rules.resolutionMode === "independent_matches"
    ? winPoints * rules.officialMatchCount
    : winPoints;
}

/** Team on a bye table, or null for any other encounter. */
export function swissByeTeam(encounter: FixtureEncounter): TeamId | null {
  const { home, away } = encounter;
  if (home.kind === "team" && away.kind === "bye") return home.teamId;
  if (home.kind === "bye" && away.kind === "team") return away.teamId;
  return null;
}

/**
 * Points used only to pair. Oriented by the encounter's slots, so it also counts a result whose
 * contribution statistics discards for lacking a correlated Team (ADR-0027, section 2).
 */
export function swissPairingPoints(
  plan: Pick<FixturePlan, "seed" | "stages">,
  scores: ReadonlyMap<EncounterId, OfficialEncounterScore>,
  rules: SwissPointsRules,
): ReadonlyMap<TeamId, number> {
  const points = new Map<TeamId, number>(plan.seed.map((teamId) => [teamId, 0]));
  const award = (teamId: TeamId, amount: number) =>
    points.set(teamId, (points.get(teamId) ?? 0) + amount);
  const { winPoints, drawPoints, lossPoints } = rules.standingPoints;
  const outcome = (goalsFor: number, goalsAgainst: number) =>
    goalsFor > goalsAgainst ? winPoints : goalsFor === goalsAgainst ? drawPoints : lossPoints;

  for (const encounter of planEncounters({ stages: plan.stages })) {
    const byeTeam = swissByeTeam(encounter);
    if (byeTeam) {
      award(byeTeam, swissPointsPerBye(rules));
      continue;
    }
    const { home, away, series } = encounter;
    const score = scores.get(encounter.id);
    if (home.kind !== "team" || away.kind !== "team" || !series || !score) continue;
    if (series.resolutionMode === "aggregate_score") {
      const homeGoals = score.slots.reduce((total, slot) => total + slot.homeGoals, 0);
      const awayGoals = score.slots.reduce((total, slot) => total + slot.awayGoals, 0);
      award(home.teamId, outcome(homeGoals, awayGoals));
      award(away.teamId, outcome(awayGoals, homeGoals));
      continue;
    }
    for (const slot of score.slots) {
      award(home.teamId, outcome(slot.homeGoals, slot.awayGoals));
      award(away.teamId, outcome(slot.awayGoals, slot.homeGoals));
    }
  }
  return points;
}

/** Rounds of the Swiss stage in playing order; empty for any other plan. */
export function swissRounds(plan: Pick<FixturePlan, "stages">): readonly FixtureRound[] {
  const stage = plan.stages.find((candidate) => candidate.kind === "swiss");
  return stage ? [...stage.rounds].sort((left, right) => left.number - right.number) : [];
}

/** Needs no further action: approved result, bye, or closed by the organizer. */
export function isSwissEncounterSettled(
  encounter: FixtureEncounter,
  hasResult: (encounterId: EncounterId) => boolean,
): boolean {
  return (
    hasResult(encounter.id) ||
    encounter.closedWithoutResult === true ||
    swissByeTeam(encounter) !== null
  );
}

export function isSwissRoundSettled(
  round: FixtureRound,
  hasResult: (encounterId: EncounterId) => boolean,
): boolean {
  return (
    round.encounters.length > 0 &&
    round.encounters.every((encounter) => isSwissEncounterSettled(encounter, hasResult))
  );
}

export interface SwissRoundProgress {
  readonly roundsTotal: number;
  readonly roundsCompleted: number;
  /** Paired round still waiting for results; null when none is open. */
  readonly currentRound: number | null;
  readonly isFinal: boolean;
}

export function swissRoundProgress(
  plan: Pick<FixturePlan, "stages">,
  hasResult: (encounterId: EncounterId) => boolean,
): SwissRoundProgress {
  const rounds = swissRounds(plan);
  const settled = rounds.filter((round) => isSwissRoundSettled(round, hasResult));
  const current = rounds.find(
    (round) => round.encounters.length > 0 && !isSwissRoundSettled(round, hasResult),
  );
  return {
    roundsTotal: rounds.length,
    roundsCompleted: settled.length,
    currentRound: current?.number ?? null,
    isFinal: settled.length === rounds.length,
  };
}
