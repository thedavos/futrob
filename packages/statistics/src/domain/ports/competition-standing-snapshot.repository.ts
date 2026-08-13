import type { CompetitionId } from "@futrob/shared-kernel";
import type { CompetitionStandingSnapshot } from "../entities/competition-standing-snapshot.ts";

export interface CompetitionStandingSnapshotRepository {
  upsert(snapshot: CompetitionStandingSnapshot): Promise<void>;
  findByCompetition(competitionId: CompetitionId): Promise<CompetitionStandingSnapshot | null>;
  deleteByCompetition(competitionId: CompetitionId): Promise<void>;
}
