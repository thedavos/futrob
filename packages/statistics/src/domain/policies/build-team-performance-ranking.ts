import { compareByTime } from "@futrob/shared-kernel";
import {
  TEAM_PERFORMANCE_NORMALIZATION_VERSION,
  TEAM_PERFORMANCE_WINDOW_VERSION,
  type TeamPerformanceRankingRow,
  type TeamPerformanceRankingSnapshot,
  type TeamPerformanceSources,
} from "../entities/team-performance-ranking-snapshot.ts";
import {
  scoreTeamPerformance,
  TEAM_PERFORMANCE_FORMULA_VERSION,
  type TeamPerformanceMetrics,
} from "./team-performance-v1.ts";
import {
  collectTeamPerformanceSample,
  compareIds,
  normalizedRatio,
  type TeamPerformanceSample,
} from "./team-performance-components.ts";

export function buildTeamPerformanceRanking(
  sources: TeamPerformanceSources,
  updatedAt: Date,
): TeamPerformanceRankingSnapshot {
  const teamIds = [
    ...new Set([
      ...sources.teamIds,
      ...sources.contributions.flatMap((row) => (row.teamId === null ? [] : [row.teamId])),
    ]),
  ].sort(compareIds);
  const samples = teamIds.map((teamId) =>
    collectTeamPerformanceSample(teamId, sources.contributions),
  );
  const comparable = samples
    .filter((sample) => sample.encounters >= 3)
    .flatMap((sample) =>
      sample.evidence.goalDifferencePerUnit === null ? [] : [sample.evidence.goalDifferencePerUnit],
    );
  const minimum = comparable.length === 0 ? null : Math.min(...comparable);
  const maximum = comparable.length === 0 ? null : Math.max(...comparable);
  const rows = samples.map((sample) =>
    buildRow(sample, minimum, maximum, sources.projectionComplete),
  );
  rows.sort((a, b) => {
    if (a.score !== null && b.score !== null)
      return b.score - a.score || compareIds(a.teamId, b.teamId);
    if (a.score !== null) return -1;
    if (b.score !== null) return 1;
    return compareIds(a.teamId, b.teamId);
  });
  let previousScore: number | null = null;
  let previousPosition: number | null = null;
  const positioned = rows.map((row, index) => {
    const position =
      row.score === null ? null : row.score === previousScore ? previousPosition : index + 1;
    previousScore = row.score;
    previousPosition = position;
    return { ...row, position };
  });
  const chronological = [...sources.contributions].sort(compareByTime((row) => row.occurredAt));
  return {
    competitionId: sources.competitionId,
    organizationId: sources.organizationId,
    formulaVersion: TEAM_PERFORMANCE_FORMULA_VERSION,
    normalizationVersion: TEAM_PERFORMANCE_NORMALIZATION_VERSION,
    windowVersion: TEAM_PERFORMANCE_WINDOW_VERSION,
    window: {
      kind: "competition_all",
      recentEncounterLimit: 5,
      minimumEncounters: 3,
      from: chronological[0]?.occurredAt.toISOString() ?? null,
      through: chronological.at(-1)?.occurredAt.toISOString() ?? null,
    },
    revisionFingerprint: sources.revisionFingerprint,
    sources: sources.revisions,
    projectionComplete: sources.projectionComplete,
    unmatchedContributions: sources.unmatchedContributions,
    rows: positioned,
    updatedAt,
  };
}

function buildRow(
  sample: TeamPerformanceSample,
  minimum: number | null,
  maximum: number | null,
  projectionComplete: boolean,
): TeamPerformanceRankingRow {
  const enough = sample.encounters >= 3 && projectionComplete;
  const gd = sample.evidence.goalDifferencePerUnit;
  const offense = normalizedRatio(sample.evidence.goalsFor, sample.evidence.shotsFor);
  const conceded = normalizedRatio(sample.evidence.goalsAgainst, sample.evidence.shotsAgainst);
  const components: TeamPerformanceMetrics = {
    results: enough
      ? normalizedRatio(sample.evidence.resultPoints, sample.evidence.resultMaximum)
      : null,
    goalDifference:
      enough && gd !== null && minimum !== null && maximum !== null
        ? minimum === maximum
          ? 50
          : 100 * ((gd - minimum) / (maximum - minimum))
        : null,
    recentForm: enough
      ? normalizedRatio(sample.evidence.recentPoints, sample.evidence.recentMaximum)
      : null,
    offensiveEfficiency: enough ? offense : null,
    defensiveEfficiency: enough && conceded !== null ? 100 - conceded : null,
  };
  const scored = scoreTeamPerformance(components);
  const reason = !projectionComplete
    ? "projection_incomplete"
    : sample.encounters === 0
      ? "no_data"
      : sample.encounters < 3
        ? "insufficient_sample"
        : scored.status === "incomplete"
          ? "missing_components"
          : "complete";
  return {
    teamId: sample.teamId,
    position: null,
    status: scored.status,
    score: scored.status === "scored" ? scored.score : null,
    components,
    missing: scored.status === "incomplete" ? scored.missing : [],
    coverage: {
      encounters: sample.encounters,
      competitiveUnits: sample.units,
      officialMatches: sample.matches.length,
      recentEncounters: sample.recentEncounters,
      attackingMatches: sample.attackingMatches,
      defendingMatches: sample.defendingMatches,
      reason,
    },
    evidence: { ...sample.evidence, comparableMinimum: minimum, comparableMaximum: maximum },
    sourceContributionIds: sample.matches.map((row) => row.id).sort(compareIds),
  };
}
