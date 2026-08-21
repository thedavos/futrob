import {
  createEmptyPartialFlags,
  PLAYER_STATISTIC_METRICS,
  type PlayerAggregateStats,
  type PlayerStatisticMetric,
  type PlayerStatisticRates,
} from "../entities/player-aggregate-stats.ts";

/**
 * Structural subset shared by player and team match contributions:
 * the statistic metrics both aggregate over.
 */
export interface StatContributionLike {
  readonly revision: number;
  readonly minutesPlayed: number | null;
  readonly goals: number | null;
  readonly assists: number | null;
  readonly shots: number | null;
  readonly passAttempts: number | null;
  readonly passesMade: number | null;
  readonly tackleAttempts: number | null;
  readonly tacklesMade: number | null;
  readonly saves: number | null;
  readonly yellowCards: number | null;
  readonly redCards: number | null;
  readonly isMvp: boolean | null;
  readonly rating: number | null;
}

export function aggregateStatContributions(
  contributions: readonly StatContributionLike[],
): PlayerAggregateStats {
  const totals = emptyMetricNumbers();
  const observed = emptyMetricNumbers();
  // Minutes accumulated only over matches where each metric was observed, so
  // per-90 rates stay consistent with averages (both restricted to matches
  // where the metric is known) instead of being diluted by unobserved ones.
  const observedMinutes = emptyMetricNumbers();
  const partial = createEmptyPartialFlags();
  let minutes = 0;

  for (const contribution of contributions) {
    if (contribution.minutesPlayed === null) {
      partial.minutes = true;
    } else {
      minutes += contribution.minutesPlayed;
    }

    for (const metric of PLAYER_STATISTIC_METRICS) {
      const value = contributionMetricValue(contribution, metric);
      if (value === null) {
        partial[metric] = true;
      } else {
        totals[metric] += value;
        observed[metric] += 1;
        if (contribution.minutesPlayed !== null) {
          observedMinutes[metric] += contribution.minutesPlayed;
        }
      }
    }
  }

  return {
    matchesPlayed: contributions.length,
    minutes,
    totals,
    averages: metricRates((metric) =>
      observed[metric] === 0 ? null : totals[metric] / observed[metric],
    ),
    per90: metricRates((metric) =>
      observedMinutes[metric] <= 0 ? null : (totals[metric] / observedMinutes[metric]) * 90,
    ),
    partial,
    sourceRevisionMax: contributions.reduce(
      (maximum, contribution) => Math.max(maximum, contribution.revision),
      0,
    ),
  };
}

function contributionMetricValue(
  contribution: StatContributionLike,
  metric: PlayerStatisticMetric,
): number | null {
  switch (metric) {
    case "goals":
    case "assists":
    case "shots":
    case "passAttempts":
    case "passesMade":
    case "tackleAttempts":
    case "tacklesMade":
    case "saves":
    case "yellowCards":
    case "redCards":
    case "rating":
      return contribution[metric];
    case "mvpAwards":
      return contribution.isMvp === null ? null : Number(contribution.isMvp);
  }
}

function emptyMetricNumbers() {
  return {
    goals: 0,
    assists: 0,
    shots: 0,
    passAttempts: 0,
    passesMade: 0,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    mvpAwards: 0,
    rating: 0,
  } satisfies Record<PlayerStatisticMetric, number>;
}

function metricRates(
  getValue: (metric: PlayerStatisticMetric) => number | null,
): PlayerStatisticRates {
  return {
    goals: getValue("goals"),
    assists: getValue("assists"),
    shots: getValue("shots"),
    passAttempts: getValue("passAttempts"),
    passesMade: getValue("passesMade"),
    tackleAttempts: getValue("tackleAttempts"),
    tacklesMade: getValue("tacklesMade"),
    saves: getValue("saves"),
    yellowCards: getValue("yellowCards"),
    redCards: getValue("redCards"),
    mvpAwards: getValue("mvpAwards"),
    rating: getValue("rating"),
  };
}
