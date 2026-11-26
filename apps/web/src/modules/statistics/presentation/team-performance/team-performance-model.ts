import type { TeamDto, TeamPerformanceRankingSnapshotDto } from "@futrob/api-contracts";
import { TEAM_PERFORMANCE_WEIGHTS, type TeamPerformanceMetric } from "@futrob/statistics";

type Row = TeamPerformanceRankingSnapshotDto["rows"][number];

export type TeamPerformanceCoverageReason = Row["coverage"]["reason"];
export type TeamPerformanceEvidence = Row["evidence"];
export type TeamPerformanceCoverage = Row["coverage"];

/** Contract order, which is also the order of the product weight table. */
export const TEAM_PERFORMANCE_METRICS = [
  "results",
  "goalDifference",
  "recentForm",
  "offensiveEfficiency",
  "defensiveEfficiency",
] as const satisfies readonly TeamPerformanceMetric[];

export const teamPerformanceWeight = (metric: TeamPerformanceMetric): number =>
  TEAM_PERFORMANCE_WEIGHTS[metric];

export type TeamPerformanceComponentView = {
  readonly metric: TeamPerformanceMetric;
  readonly value: number | null;
  readonly weight: number;
  /** Weighted contribution to the 0-100 score; null when the component is missing. */
  readonly contribution: number | null;
};

export type TeamPerformanceRowView = {
  readonly teamId: string;
  /** Null when the team list is unavailable or no longer includes this team. */
  readonly name: string | null;
  readonly position: number | null;
  readonly score: number | null;
  readonly components: readonly TeamPerformanceComponentView[];
  readonly missing: readonly TeamPerformanceMetric[];
  readonly reason: TeamPerformanceCoverageReason;
  readonly encounters: number;
  readonly coverage: TeamPerformanceCoverage;
  readonly evidence: TeamPerformanceEvidence;
};

/**
 * Keeps the server order (score, then team id; incomplete rows last). Positions and
 * scores come from the snapshot as-is: nothing is recomputed or zero-filled here.
 */
export function teamPerformanceRows(
  snapshot: TeamPerformanceRankingSnapshotDto,
  names: ReadonlyMap<string, string>,
): readonly TeamPerformanceRowView[] {
  return snapshot.rows.map((row) => ({
    teamId: row.teamId,
    name: names.get(row.teamId) ?? null,
    position: row.position,
    score: row.score,
    components: TEAM_PERFORMANCE_METRICS.map((metric) => {
      const value = row.components[metric];
      const weight = teamPerformanceWeight(metric);
      return {
        metric,
        value,
        weight,
        contribution: value === null ? null : (value * weight) / 100,
      };
    }),
    missing: TEAM_PERFORMANCE_METRICS.filter((metric) => row.missing.includes(metric)),
    reason: row.coverage.reason,
    encounters: row.coverage.encounters,
    coverage: row.coverage,
    evidence: row.evidence,
  }));
}

export type TeamPerformanceSummary = {
  readonly scored: number;
  readonly incomplete: number;
  readonly approvedSources: number;
};

export function teamPerformanceSummary(
  snapshot: TeamPerformanceRankingSnapshotDto,
): TeamPerformanceSummary {
  const scored = snapshot.rows.filter((row) => row.status === "scored").length;
  return {
    scored,
    incomplete: snapshot.rows.length - scored,
    approvedSources: snapshot.sources.filter((source) => source.status === "approved").length,
  };
}

export type TeamPerformanceMetricLeader = {
  readonly teamIds: readonly string[];
  readonly value: number;
  readonly evidence: TeamPerformanceEvidence;
  readonly coverage: TeamPerformanceCoverage;
};

export type TeamPerformanceHighlights = {
  readonly leader: {
    readonly teamIds: readonly string[];
    readonly score: number;
    readonly leadOverSecond: number | null;
  } | null;
  readonly bestForm: TeamPerformanceMetricLeader | null;
  readonly bestDefense: TeamPerformanceMetricLeader | null;
  readonly scored: number;
  readonly incomplete: number;
  readonly total: number;
  readonly approvedSources: number;
  readonly bestByMetric: Readonly<Partial<Record<TeamPerformanceMetric, number>>>;
};

function metricLeader(
  rows: readonly Row[],
  metric: TeamPerformanceMetric,
): TeamPerformanceMetricLeader | null {
  let max: number | null = null;
  let leaders: Row[] = [];
  for (const row of rows) {
    const value = row.components[metric];
    if (value === null) continue;
    if (max === null || value > max) {
      max = value;
      leaders = [row];
    } else if (value === max) {
      leaders.push(row);
    }
  }
  const first = leaders[0];
  if (max === null || !first) return null;
  return {
    teamIds: leaders.map((row) => row.teamId),
    value: max,
    evidence: first.evidence,
    coverage: first.coverage,
  };
}

/**
 * Derives executive KPI highlights directly from the server snapshot without inventing
 * missing values or altering server positions.
 */
export function teamPerformanceHighlights(
  snapshot: TeamPerformanceRankingSnapshotDto,
): TeamPerformanceHighlights {
  const summary = teamPerformanceSummary(snapshot);
  const scoredRows = snapshot.rows.filter(
    (row): row is Row & { readonly score: number; readonly position: number } =>
      row.status === "scored" && row.score !== null && row.position !== null,
  );

  const first = scoredRows[0];
  const leader = first
    ? (() => {
        const tied = scoredRows.filter((row) => row.score === first.score);
        const runnerUp = scoredRows[1];
        return {
          teamIds: tied.map((row) => row.teamId),
          score: first.score,
          leadOverSecond: runnerUp ? first.score - runnerUp.score : null,
        };
      })()
    : null;

  const bestByMetric: Partial<Record<TeamPerformanceMetric, number>> = {};
  for (const metric of TEAM_PERFORMANCE_METRICS) {
    const top = metricLeader(snapshot.rows, metric);
    if (top && top.value > 0) bestByMetric[metric] = top.value;
  }

  return {
    leader,
    bestForm: metricLeader(snapshot.rows, "recentForm"),
    bestDefense: metricLeader(snapshot.rows, "defensiveEfficiency"),
    scored: summary.scored,
    incomplete: summary.incomplete,
    total: snapshot.rows.length,
    approvedSources: summary.approvedSources,
    bestByMetric,
  };
}

/** Names are a separate, optional read: the ranking stays valid without them. */
export type TeamPerformanceNames =
  | { readonly kind: "loading" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "ready"; readonly teams: readonly TeamDto[] };
