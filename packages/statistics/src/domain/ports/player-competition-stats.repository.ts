import type { CompetitionId } from "@futrob/shared-kernel";
import type { PlayerCompetitionStats } from "../entities/player-competition-stats.ts";

export interface PlayerCompetitionStatsRepository {
  upsert(stats: PlayerCompetitionStats): Promise<void>;
  findByPlayerAndCompetition(
    playerProfileId: string,
    competitionId: CompetitionId,
  ): Promise<PlayerCompetitionStats | null>;
  listByPlayer(playerProfileId: string): Promise<PlayerCompetitionStats[]>;
}
