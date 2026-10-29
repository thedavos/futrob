import type { CompetitionId } from "@futrob/shared-kernel";
import type { RankingEligibilityConfig } from "../entities/ranking-snapshot.ts";

export interface CompetitionRankingEligibilityReaderPort {
  getRankingEligibility(competitionId: CompetitionId): Promise<RankingEligibilityConfig | null>;
}
