export const TEAM_PERFORMANCE_FORMULA_VERSION = "team-performance-v1" as const;

/** Product weights from /product/team-performance-v1.md. Do not copy game-data WEIGHTS. */
export const TEAM_PERFORMANCE_WEIGHTS = {
  results: 40,
  goalDifference: 20,
  recentForm: 20,
  offensiveEfficiency: 10,
  defensiveEfficiency: 10,
} as const;

export type TeamPerformanceMetric = keyof typeof TEAM_PERFORMANCE_WEIGHTS;

export interface TeamPerformanceMetrics {
  readonly results: number | null;
  readonly goalDifference: number | null;
  readonly recentForm: number | null;
  readonly offensiveEfficiency: number | null;
  readonly defensiveEfficiency: number | null;
}

export type TeamPerformanceScore =
  | {
      readonly status: "scored";
      readonly formulaVersion: typeof TEAM_PERFORMANCE_FORMULA_VERSION;
      readonly score: number;
    }
  | {
      readonly status: "incomplete";
      readonly formulaVersion: typeof TEAM_PERFORMANCE_FORMULA_VERSION;
      readonly missing: readonly TeamPerformanceMetric[];
    };

const METRICS = [
  "results",
  "goalDifference",
  "recentForm",
  "offensiveEfficiency",
  "defensiveEfficiency",
] as const satisfies readonly TeamPerformanceMetric[];

/**
 * Fail-closed v1 score. Missing components are listed, never treated as zero.
 * Does not persist a ranking snapshot; callers supply already-normalized 0–100 inputs.
 */
export function scoreTeamPerformance(metrics: TeamPerformanceMetrics): TeamPerformanceScore {
  const missing = METRICS.filter((metric) => !isPresentScore(metrics[metric]));
  if (missing.length > 0) {
    return {
      status: "incomplete",
      formulaVersion: TEAM_PERFORMANCE_FORMULA_VERSION,
      missing,
    };
  }

  let weighted = 0;
  for (const metric of METRICS) {
    const value = metrics[metric];
    if (!isPresentScore(value)) {
      return {
        status: "incomplete",
        formulaVersion: TEAM_PERFORMANCE_FORMULA_VERSION,
        missing: [metric],
      };
    }
    weighted += value * (TEAM_PERFORMANCE_WEIGHTS[metric] / 100);
  }

  return {
    status: "scored",
    formulaVersion: TEAM_PERFORMANCE_FORMULA_VERSION,
    score: Math.round(weighted),
  };
}

function isPresentScore(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}
