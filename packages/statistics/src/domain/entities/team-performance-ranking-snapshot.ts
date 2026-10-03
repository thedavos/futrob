import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type {
  TeamPerformanceMetric,
  TeamPerformanceMetrics,
} from "../policies/team-performance-v1.ts";
import type { TeamMatchContribution } from "./team-match-contribution.ts";

export const TEAM_PERFORMANCE_NORMALIZATION_VERSION = "team-performance-normalization-v1" as const;
export const TEAM_PERFORMANCE_WINDOW_VERSION = "competition-all-form-5-min-3-v1" as const;

export interface TeamPerformanceScope {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
}

export interface TeamPerformanceContribution extends TeamMatchContribution {
  /** From the immutable official slot, never approval time or the host calendar. */
  readonly occurredAt: Date;
}

export interface TeamPerformanceSourceRevision {
  readonly officialResultId: string;
  readonly encounterId: string;
  readonly revision: number;
  readonly status: "approved" | "voided";
}

export interface TeamPerformanceSources extends TeamPerformanceScope {
  readonly teamIds: readonly TeamId[];
  readonly contributions: readonly TeamPerformanceContribution[];
  readonly revisions: readonly TeamPerformanceSourceRevision[];
  readonly revisionFingerprint: string;
  readonly projectionComplete: boolean;
  readonly unmatchedContributions: number;
}

export interface TeamPerformanceCoverage {
  readonly encounters: number;
  readonly competitiveUnits: number;
  readonly officialMatches: number;
  readonly recentEncounters: number;
  readonly attackingMatches: number;
  readonly defendingMatches: number;
  readonly reason:
    | "complete"
    | "no_data"
    | "insufficient_sample"
    | "missing_components"
    | "projection_incomplete";
}

export interface TeamPerformanceEvidence {
  readonly resultPoints: number;
  readonly resultMaximum: number;
  readonly goalDifferencePerUnit: number | null;
  readonly comparableMinimum: number | null;
  readonly comparableMaximum: number | null;
  readonly recentPoints: number;
  readonly recentMaximum: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly shotsFor: number | null;
  readonly shotsAgainst: number | null;
}

export interface TeamPerformanceRankingRow {
  readonly teamId: TeamId;
  /** Competition ranking: 1, 1, 3. Incomplete teams have no position. */
  readonly position: number | null;
  readonly status: "scored" | "incomplete";
  readonly score: number | null;
  readonly components: TeamPerformanceMetrics;
  readonly missing: readonly TeamPerformanceMetric[];
  readonly coverage: TeamPerformanceCoverage;
  readonly evidence: TeamPerformanceEvidence;
  readonly sourceContributionIds: readonly string[];
}

export interface TeamPerformanceRankingSnapshot extends TeamPerformanceScope {
  readonly formulaVersion: "team-performance-v1";
  readonly normalizationVersion: typeof TEAM_PERFORMANCE_NORMALIZATION_VERSION;
  readonly windowVersion: typeof TEAM_PERFORMANCE_WINDOW_VERSION;
  readonly window: {
    readonly kind: "competition_all";
    readonly recentEncounterLimit: 5;
    readonly minimumEncounters: 3;
    readonly from: string | null;
    readonly through: string | null;
  };
  readonly revisionFingerprint: string;
  readonly sources: readonly TeamPerformanceSourceRevision[];
  readonly projectionComplete: boolean;
  readonly unmatchedContributions: number;
  readonly rows: readonly TeamPerformanceRankingRow[];
  readonly updatedAt: Date;
}
