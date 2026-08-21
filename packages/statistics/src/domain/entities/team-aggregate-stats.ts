import type {
  PlayerStatisticPartialFlags,
  PlayerStatisticRates,
  PlayerStatisticTotals,
} from "./player-aggregate-stats.ts";

/**
 * Team-level aggregate stats.
 *
 * Deliberately a standalone model (not an extension of the player shape):
 * - `minutes` is team time on pitch (match duration, rolled up as the longest
 *   player stint), not the sum of player minutes — so `per90` reads as
 *   "events per 90 minutes of match time".
 * - Metric totals come from strict slot rollups: a match where any player row
 *   lacks a value leaves that metric unknown for the match, and `partial`
 *   flags it here instead of treating missing data as zero.
 *
 * Today the field set mirrors the player aggregate because both persist to the
 * same jsonb columns; keep this type independent so it can diverge without
 * re-coupling the models.
 */
export interface TeamAggregateStats {
  readonly matchesPlayed: number;
  readonly minutes: number;
  readonly totals: PlayerStatisticTotals;
  readonly averages: PlayerStatisticRates;
  readonly per90: PlayerStatisticRates;
  readonly partial: PlayerStatisticPartialFlags;
  readonly sourceRevisionMax: number;
}
