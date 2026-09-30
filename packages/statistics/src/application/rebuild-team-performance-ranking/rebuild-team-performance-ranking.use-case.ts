import type { ClockPort, TransactionPort } from "@futrob/shared-kernel";
import type {
  TeamPerformanceRankingSnapshot,
  TeamPerformanceScope,
} from "../../domain/entities/team-performance-ranking-snapshot.ts";
import { TeamPerformanceSnapshotConflict } from "../../domain/errors/team-performance.errors.ts";
import type {
  TeamPerformanceRankingLockPort,
  TeamPerformanceRankingRepository,
  TeamPerformanceSourcePort,
} from "../../domain/ports/team-performance-ranking.repository.ts";
import { buildTeamPerformanceRanking } from "../../domain/policies/build-team-performance-ranking.ts";

export interface RebuildTeamPerformanceRankingDependencies {
  readonly sources: TeamPerformanceSourcePort;
  readonly rankings: TeamPerformanceRankingRepository;
  readonly lock: TeamPerformanceRankingLockPort;
  readonly transaction: TransactionPort;
  readonly clock: ClockPort;
}

export class RebuildTeamPerformanceRankingUseCase {
  constructor(private readonly deps: RebuildTeamPerformanceRankingDependencies) {}

  execute(scope: TeamPerformanceScope): Promise<TeamPerformanceRankingSnapshot> {
    return this.deps.transaction.runInTransaction(() =>
      this.deps.lock.runExclusive(scope.competitionId, async () => {
        // Read *after* acquiring exclusion; a newer source set cannot be replaced by an old read.
        const previous = await this.deps.rankings.find(scope);
        const sources = await this.deps.sources.read(scope);
        const snapshot = buildTeamPerformanceRanking(sources, this.deps.clock.now());
        if (!(await this.deps.rankings.replace(snapshot, previous?.revisionFingerprint ?? null))) {
          throw new TeamPerformanceSnapshotConflict({
            code: "statistics.team_performance_snapshot_conflict",
            message: "The team performance snapshot changed during rebuild.",
          });
        }
        return snapshot;
      }),
    );
  }
}
