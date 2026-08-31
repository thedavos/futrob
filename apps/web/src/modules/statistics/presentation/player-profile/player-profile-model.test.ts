import { describe, expect, it } from "vite-plus/test";
import {
  attributeExtremes,
  defaultAttributeCategory,
  lastOutcomeSplit,
  lastOutcomes,
  playedMatchCount,
  primaryClubName,
  ratingAxisScale,
  ratingEvolutionView,
  winPercent,
} from "./player-profile-model.ts";
import { gameProfileReadyFixture } from "./player-statistics-page.fixtures.ts";

describe("player-profile-model", () => {
  it("computes win share from the played record", () => {
    const profile = gameProfileReadyFixture();
    expect(playedMatchCount(profile.summary)).toBe(28);
    expect(winPercent(profile.summary)).toBe(57);
  });

  it("returns no win share when the player has no results", () => {
    expect(
      winPercent({
        ...gameProfileReadyFixture().summary,
        wins: 0,
        draws: 0,
        losses: 0,
      }),
    ).toBeNull();
  });

  it("builds half-step rating axis ticks from the visible range", () => {
    expect(ratingAxisScale([6.4, 7.1, null, 7.8, 7.2])).toEqual({
      domain: [6, 8],
      ticks: [6, 6.5, 7, 7.5, 8],
    });
    expect(ratingAxisScale([7.2, 7.2])).toEqual({
      domain: [7, 7.5],
      ticks: [7, 7.5],
    });
    expect(ratingAxisScale([null, null])).toEqual({
      domain: [0, 10],
      ticks: [0, 2, 4, 6, 8, 10],
    });
  });

  it("classifies rating evolution as empty, unavailable, or ready", () => {
    expect(ratingEvolutionView([])).toBe("empty");
    expect(
      ratingEvolutionView([
        { occurredAt: "2026-08-01T00:00:00.000Z", rating: null, outcome: "win" },
        { occurredAt: "2026-08-02T00:00:00.000Z", rating: null, outcome: "loss" },
      ]),
    ).toBe("unavailable");
    expect(ratingEvolutionView(gameProfileReadyFixture().evolution)).toBe("ready");
  });

  it("takes the most recent outcomes for form", () => {
    expect(lastOutcomes(gameProfileReadyFixture().evolution, 5)).toEqual([
      "loss",
      "win",
      "draw",
      "win",
      "unknown",
    ]);
  });

  it("splits the last N outcomes into a decided record", () => {
    expect(lastOutcomeSplit(gameProfileReadyFixture().evolution, 5)).toEqual({
      wins: 2,
      draws: 1,
      losses: 1,
      unknowns: 1,
    });
    expect(lastOutcomeSplit([], 5)).toEqual({
      wins: 0,
      draws: 0,
      losses: 0,
      unknowns: 0,
    });
  });

  it("picks strength and the category to improve from distinct scores", () => {
    const attributes = gameProfileReadyFixture().attributes;
    expect(defaultAttributeCategory(attributes)?.category).toBe("discipline");
    expect(attributeExtremes(attributes)).toEqual({
      strength: expect.objectContaining({ category: "discipline", score: 88 }),
      toImprove: expect.objectContaining({ category: "defense", score: 41 }),
    });
  });

  it("uses the first club as the identity club", () => {
    expect(primaryClubName(gameProfileReadyFixture())).toBe("Cuervos FC1");
    expect(primaryClubName(gameProfileReadyFixture({ byTeam: [] }))).toBeNull();
  });
});
