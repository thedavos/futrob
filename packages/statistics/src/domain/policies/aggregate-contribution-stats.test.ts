import { describe, expect, it } from "vite-plus/test";
import { aggregateStatContributions } from "./aggregate-contribution-stats.ts";
import type { StatContributionLike } from "./aggregate-contribution-stats.ts";

function contribution(overrides: Partial<StatContributionLike> = {}): StatContributionLike {
  return {
    revision: 1,
    minutesPlayed: 90,
    goals: 1,
    assists: 0,
    shots: 2,
    passAttempts: 10,
    passesMade: 8,
    tackleAttempts: 3,
    tacklesMade: 2,
    saves: null,
    yellowCards: 0,
    redCards: 0,
    isMvp: false,
    rating: 7,
    ...overrides,
  };
}

describe("aggregateStatContributions per-90 consistency", () => {
  it("computes per90 against minutes from observed matches only", () => {
    // Two matches; the second lacks shots data but has known minutes.
    const stats = aggregateStatContributions([
      contribution({ goals: 2, shots: 4 }),
      contribution({ shots: null }),
    ]);

    expect(stats.partial.shots).toBe(true);
    // averages: 1 match with shots → 4 shots in that match.
    expect(stats.averages.shots).toBe(4);
    // per90 must use only the observed match's minutes (90), not both (180).
    expect(stats.per90.shots).toBeCloseTo(4);
  });

  it("keeps full-minutes per90 when every match observes the metric", () => {
    const stats = aggregateStatContributions([contribution({ goals: 2 }), contribution()]);
    expect(stats.per90.goals).toBeCloseTo(((2 + 1) / 180) * 90);
  });
});
