import type { PlayerAggregateStats } from "../entities/player-aggregate-stats.ts";
import type { PlayerMatchContribution } from "../entities/player-match-contribution.ts";
import { aggregateStatContributions } from "./aggregate-contribution-stats.ts";

export function aggregatePlayerContributions(
  contributions: readonly PlayerMatchContribution[],
): PlayerAggregateStats {
  return aggregateStatContributions(contributions);
}
