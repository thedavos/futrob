import {
  createEmptyPartialFlags,
  PLAYER_STATISTIC_METRICS,
  type PlayerAggregateStats,
  type PlayerStatisticMetric,
  type PlayerStatisticRates,
} from "../entities/player-aggregate-stats.ts";
import type { PlayerMatchContribution } from "../entities/player-match-contribution.ts";

export function aggregatePlayerContributions(
  contributions: readonly PlayerMatchContribution[],
): PlayerAggregateStats {
  const totals = emptyMetricNumbers();
  const observed = emptyMetricNumbers();
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
      observed[metric] === 0 || minutes <= 0 ? null : (totals[metric] / minutes) * 90,
    ),
    partial,
    sourceRevisionMax: contributions.reduce(
      (maximum, contribution) => Math.max(maximum, contribution.revision),
      0,
    ),
  };
}

function contributionMetricValue(
  contribution: PlayerMatchContribution,
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
