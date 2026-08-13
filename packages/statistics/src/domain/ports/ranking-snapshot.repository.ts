import type { CompetitionId } from "@futrob/shared-kernel";
import type { RankingKind, RankingSnapshot } from "../entities/ranking-snapshot.ts";

export interface RankingSnapshotRepository {
  replaceForCompetition(
    competitionId: CompetitionId,
    snapshots: readonly RankingSnapshot[],
  ): Promise<void>;
  listByCompetition(competitionId: CompetitionId): Promise<RankingSnapshot[]>;
  findByCompetitionAndKind(
    competitionId: CompetitionId,
    kind: RankingKind,
  ): Promise<RankingSnapshot | null>;
  deleteByCompetition(competitionId: CompetitionId): Promise<void>;
}
