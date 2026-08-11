export const PLAYER_STATISTIC_METRICS = [
  "goals",
  "assists",
  "shots",
  "passAttempts",
  "passesMade",
  "tackleAttempts",
  "tacklesMade",
  "saves",
  "yellowCards",
  "redCards",
  "mvpAwards",
  "rating",
] as const;

export type PlayerStatisticMetric = (typeof PLAYER_STATISTIC_METRICS)[number];
export type PlayerStatisticTotals = Readonly<Record<PlayerStatisticMetric, number>>;
export type PlayerStatisticRates = Readonly<Record<PlayerStatisticMetric, number | null>>;
export type PlayerStatisticPartialFlags = Readonly<
  Record<PlayerStatisticMetric | "minutes", boolean>
>;

export interface PlayerAggregateStats {
  readonly matchesPlayed: number;
  readonly minutes: number;
  readonly totals: PlayerStatisticTotals;
  readonly averages: PlayerStatisticRates;
  readonly per90: PlayerStatisticRates;
  readonly partial: PlayerStatisticPartialFlags;
  readonly sourceRevisionMax: number;
}
