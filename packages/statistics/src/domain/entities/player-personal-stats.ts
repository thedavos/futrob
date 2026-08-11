import type { PlayerAggregateStats } from "./player-aggregate-stats.ts";

export interface PlayerPersonalStats extends PlayerAggregateStats {
  readonly playerProfileId: string;
  readonly updatedAt: Date;
}
