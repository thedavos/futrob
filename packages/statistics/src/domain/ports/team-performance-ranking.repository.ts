import type { CompetitionId } from "@futrob/shared-kernel";
import type {
  TeamPerformanceRankingSnapshot,
  TeamPerformanceScope,
  TeamPerformanceSources,
} from "../entities/team-performance-ranking-snapshot.ts";

export interface TeamPerformanceRankingRepository {
  find(scope: TeamPerformanceScope): Promise<TeamPerformanceRankingSnapshot | null>;
  /** Compare-and-set the current versioned snapshot. Must run under the source mutation lock. */
  replace(
    snapshot: TeamPerformanceRankingSnapshot,
    expectedFingerprint: string | null,
  ): Promise<boolean>;
}

export interface TeamPerformanceSourcePort {
  validateScope(scope: TeamPerformanceScope): Promise<void>;
  read(scope: TeamPerformanceScope): Promise<TeamPerformanceSources>;
}

/** Serializes official writes and projection reads for the whole comparable set. */
export interface TeamPerformanceRankingLockPort {
  runExclusive<T>(competitionId: CompetitionId, operation: () => Promise<T>): Promise<T>;
}
