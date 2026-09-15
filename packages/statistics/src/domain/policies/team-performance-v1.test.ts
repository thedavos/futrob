import { describe, expect, it } from "vite-plus/test";
import {
  TEAM_PERFORMANCE_FORMULA_VERSION,
  scoreTeamPerformance,
} from "./team-performance-v1.ts";

const complete = {
  results: 80,
  goalDifference: 70,
  recentForm: 60,
  offensiveEfficiency: 80,
  defensiveEfficiency: 60,
};

describe("team-performance-v1", () => {
  it("score-reproducible", () => {
    const first = scoreTeamPerformance(complete);
    const second = scoreTeamPerformance(complete);
    expect(first).toEqual({
      status: "scored",
      formulaVersion: TEAM_PERFORMANCE_FORMULA_VERSION,
      score: 72,
    });
    expect(second).toEqual(first);
  });

  it("absent-metrics-not-zero-filled", () => {
    expect(
      scoreTeamPerformance({
        ...complete,
        offensiveEfficiency: null,
        defensiveEfficiency: null,
      }),
    ).toEqual({
      status: "incomplete",
      formulaVersion: TEAM_PERFORMANCE_FORMULA_VERSION,
      missing: ["offensiveEfficiency", "defensiveEfficiency"],
    });
  });
});
