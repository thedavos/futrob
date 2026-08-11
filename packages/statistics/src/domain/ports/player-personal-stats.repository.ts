import type { PlayerPersonalStats } from "../entities/player-personal-stats.ts";

export interface PlayerPersonalStatsRepository {
  upsert(stats: PlayerPersonalStats): Promise<void>;
  findByPlayerProfile(playerProfileId: string): Promise<PlayerPersonalStats | null>;
}
