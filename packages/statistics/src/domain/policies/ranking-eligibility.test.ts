import { describe, expect, it } from "vite-plus/test";
import { isEligibleForRanking, resolveRankingEligibility } from "./ranking-eligibility.ts";

describe("ranking eligibility (DEC-043)", () => {
  it("excludes a player with fewer than 3 matches and under 60% team minutes", () => {
    expect(
      isEligibleForRanking({
        matchesPlayed: 2,
        playerMinutes: 90,
        teamMinutes: 180,
      }),
    ).toBe(false);
  });

  it("includes a player with at least 3 matches", () => {
    expect(
      isEligibleForRanking({
        matchesPlayed: 3,
        playerMinutes: 10,
        teamMinutes: 270,
      }),
    ).toBe(true);
  });

  it("includes a player under the match floor when they reach 60% of team minutes", () => {
    expect(
      isEligibleForRanking({
        matchesPlayed: 2,
        playerMinutes: 108,
        teamMinutes: 180,
      }),
    ).toBe(true);
  });

  it("treats exactly 60% team minutes as eligible", () => {
    expect(
      isEligibleForRanking({
        matchesPlayed: 1,
        playerMinutes: 54,
        teamMinutes: 90,
      }),
    ).toBe(true);
  });

  it("rejects zero team minutes when under the match floor", () => {
    expect(
      isEligibleForRanking({
        matchesPlayed: 2,
        playerMinutes: 180,
        teamMinutes: 0,
      }),
    ).toBe(false);
  });

  it("honours an eligibility override on rebuild input", () => {
    expect(
      isEligibleForRanking({
        matchesPlayed: 3,
        playerMinutes: 90,
        teamMinutes: 270,
        eligibility: { minimumMatches: 5 },
      }),
    ).toBe(false);
    expect(resolveRankingEligibility({ minimumMatches: 5 }).minimumMatches).toBe(5);
    expect(resolveRankingEligibility().minimumTeamMinutesRatio).toBe(0.6);
  });
});
