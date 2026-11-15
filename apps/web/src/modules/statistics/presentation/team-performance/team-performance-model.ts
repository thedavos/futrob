import type { TeamDto, TeamPerformanceRankingSnapshotDto } from "@futrob/api-contracts";
import { TEAM_PERFORMANCE_WEIGHTS, type TeamPerformanceMetric } from "@futrob/statistics";

type Row = TeamPerformanceRankingSnapshotDto["rows"][number];

export type TeamPerformanceCoverageReason = Row["coverage"]["reason"];

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

export type TeamPerformanceRowView = {
  readonly teamId: string;
  /** Null when the team list is unavailable or no longer includes this team. */
  readonly name: string | null;
  readonly position: number | null;
  readonly score: number | null;
  readonly components: readonly {
    readonly metric: TeamPerformanceMetric;
    readonly value: number | null;
  }[];
  readonly missing: readonly TeamPerformanceMetric[];
  readonly reason: TeamPerformanceCoverageReason;
  readonly encounters: number;
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
    components: TEAM_PERFORMANCE_METRICS.map((metric) => ({
      metric,
      value: row.components[metric],
    })),
    missing: TEAM_PERFORMANCE_METRICS.filter((metric) => row.missing.includes(metric)),
    reason: row.coverage.reason,
    encounters: row.coverage.encounters,
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

/** Names are a separate, optional read: the ranking stays valid without them. */
export type TeamPerformanceNames =
  | { readonly kind: "loading" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "ready"; readonly teams: readonly TeamDto[] };
