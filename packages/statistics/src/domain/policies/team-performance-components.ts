import { compareByTime, type TeamId } from "@futrob/shared-kernel";
import type {
  TeamPerformanceContribution,
  TeamPerformanceEvidence,
} from "../entities/team-performance-ranking-snapshot.ts";

interface CompetitiveUnit {
  readonly goalsFor: number;
  readonly goalsAgainst: number;
}

export interface TeamPerformanceSample {
  readonly teamId: TeamId;
  readonly matches: readonly TeamPerformanceContribution[];
  readonly encounters: number;
  readonly units: number;
  readonly recentEncounters: number;
  readonly attackingMatches: number;
  readonly defendingMatches: number;
  readonly evidence: TeamPerformanceEvidence;
}

export function collectTeamPerformanceSample(
  teamId: TeamId,
  all: readonly TeamPerformanceContribution[],
): TeamPerformanceSample {
  const matches = all.filter(
    (match) => match.teamId === teamId && match.correlationStatus === "matched",
  );
  const byEncounter = new Map<string, TeamPerformanceContribution[]>();
  for (const match of matches) {
    const encounter = byEncounter.get(match.encounterId) ?? [];
    encounter.push(match);
    byEncounter.set(match.encounterId, encounter);
  }
  const encounters = [...byEncounter.entries()]
    .map(([id, slots]) => ({
      id,
      occurredAt: [...slots].sort(compareByTime((slot) => slot.occurredAt, "desc"))[0]!.occurredAt,
      units: competitiveUnits(slots),
    }))
    .sort(
      (a, b) =>
        compareByTime((encounter: typeof a) => encounter.occurredAt, "desc")(a, b) ||
        compareIds(a.id, b.id),
    );
  const units = encounters.flatMap((encounter) => encounter.units);
  const recent = encounters.slice(0, 5);
  // Each encounter carries equal weight in form, even if independent slots differ in count.
  const recentPoints = recent.reduce(
    (sum, encounter) => sum + points(encounter.units) / encounter.units.length,
    0,
  );
  const ownShots = validShotCounts(matches.map((match) => match.shots));
  const opponentCounts = matches.map((match) => {
    const opposite = all.find(
      (other) =>
        other.officialResultId === match.officialResultId &&
        other.revision === match.revision &&
        other.officialSlot === match.officialSlot &&
        other.side !== match.side,
    );
    return opposite?.shots ?? null;
  });
  const opponentShots = validShotCounts(opponentCounts);
  const gd = units.reduce((sum, unit) => sum + unit.goalsFor - unit.goalsAgainst, 0);
  return {
    teamId,
    matches,
    encounters: encounters.length,
    units: units.length,
    recentEncounters: recent.length,
    attackingMatches: matches.filter((match) => validCount(match.shots)).length,
    defendingMatches: opponentCounts.filter(validCount).length,
    evidence: {
      resultPoints: points(units),
      resultMaximum: units.length * 3,
      goalDifferencePerUnit: units.length === 0 ? null : gd / units.length,
      comparableMinimum: null,
      comparableMaximum: null,
      recentPoints,
      recentMaximum: recent.length * 3,
      goalsFor: matches.reduce((sum, match) => sum + match.goalsFor, 0),
      goalsAgainst: matches.reduce((sum, match) => sum + match.goalsAgainst, 0),
      shotsFor: ownShots,
      shotsAgainst: opponentShots,
    },
  };
}

function competitiveUnits(slots: readonly TeamPerformanceContribution[]): CompetitiveUnit[] {
  if (slots[0]?.resolutionMode === "aggregate_score") {
    return [
      {
        goalsFor: slots.reduce((sum, slot) => sum + slot.goalsFor, 0),
        goalsAgainst: slots.reduce((sum, slot) => sum + slot.goalsAgainst, 0),
      },
    ];
  }
  return [...slots];
}

function points(units: readonly CompetitiveUnit[]): number {
  return units.reduce(
    (sum, unit) =>
      sum + (unit.goalsFor > unit.goalsAgainst ? 3 : unit.goalsFor === unit.goalsAgainst ? 1 : 0),
    0,
  );
}

function validCount(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value >= 0;
}

function validShotCounts(counts: readonly (number | null)[]): number | null {
  if (counts.length === 0 || !counts.every(validCount)) return null;
  return counts.reduce<number>((sum, count) => sum + (count ?? 0), 0);
}

export function normalizedRatio(numerator: number, denominator: number | null): number | null {
  if (
    denominator === null ||
    denominator <= 0 ||
    !Number.isFinite(denominator) ||
    !Number.isFinite(numerator) ||
    numerator < 0 ||
    numerator > denominator
  )
    return null;
  return 100 * (numerator / denominator);
}

/** Code-unit ordering is independent of locale/ICU and works across runtimes. */
export function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
