import type { PlayerPersonalStats } from "../../domain/entities/player-personal-stats.ts";
import type { PlayerPersonalStatsRepository } from "../../domain/ports/player-personal-stats.repository.ts";

export class GetMyPersonalStatisticsUseCase {
  constructor(private readonly personalStats: PlayerPersonalStatsRepository) {}

  async execute(input: { readonly playerProfileId: string }): Promise<PlayerPersonalStats | null> {
    return this.personalStats.findByPlayerProfile(input.playerProfileId);
  }
}
