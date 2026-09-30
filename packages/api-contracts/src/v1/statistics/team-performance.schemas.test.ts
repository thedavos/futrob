import { describe, expect, it } from "vite-plus/test";
import {
  getTeamPerformanceRankingResponseSchema,
  teamPerformanceRankingRowSchema,
} from "./team-performance.schemas.ts";

const row = {
  teamId: "team-a",
  position: 1,
  status: "scored",
  score: 95,
  components: {
    results: 100,
    goalDifference: 100,
    recentForm: 100,
    offensiveEfficiency: 50,
    defensiveEfficiency: 100,
  },
  missing: [],
  coverage: {
    encounters: 3,
    competitiveUnits: 3,
    officialMatches: 3,
    recentEncounters: 3,
    attackingMatches: 3,
    defendingMatches: 3,
    reason: "complete",
  },
  evidence: {
    resultPoints: 9,
    resultMaximum: 9,
    goalDifferencePerUnit: 2,
    comparableMinimum: -2,
    comparableMaximum: 2,
    recentPoints: 9,
    recentMaximum: 9,
    goalsFor: 6,
    goalsAgainst: 0,
    shotsFor: 12,
    shotsAgainst: 12,
  },
  sourceContributionIds: ["official-1:1:1:home"],
};

describe("team performance wire", () => {
  it("accepts null before the first projection and fully explained scores", () => {
    expect(getTeamPerformanceRankingResponseSchema.parse({ ranking: null })).toEqual({
      ranking: null,
    });
    expect(teamPerformanceRankingRowSchema.parse(row).score).toBe(95);
  });
  it("accepts incomplete rows with null score and explicit missing components", () => {
    expect(
      teamPerformanceRankingRowSchema.parse({
        ...row,
        status: "incomplete",
        score: null,
        position: null,
        missing: ["offensiveEfficiency"],
        components: { ...row.components, offensiveEfficiency: null },
        coverage: { ...row.coverage, reason: "missing_components" },
      }).score,
    ).toBeNull();
  });
  it.each([
    { score: null },
    { position: null },
    { score: 101 },
    { missing: ["offensiveEfficiency"] },
    { components: { ...row.components, defensiveEfficiency: null } },
  ])("rejects inconsistent scored rows %j", (patch) => {
    expect(teamPerformanceRankingRowSchema.safeParse({ ...row, ...patch }).success).toBe(false);
  });
  it("does not accept an incomplete fake zero score", () => {
    expect(
      teamPerformanceRankingRowSchema.safeParse({
        ...row,
        status: "incomplete",
        score: 0,
        position: null,
        missing: ["offensiveEfficiency"],
      }).success,
    ).toBe(false);
  });

  it("requires missing keys to explain exactly the absent components", () => {
    expect(
      teamPerformanceRankingRowSchema.safeParse({
        ...row,
        status: "incomplete",
        score: null,
        position: null,
        components: { ...row.components, defensiveEfficiency: null },
        missing: ["offensiveEfficiency"],
      }).success,
    ).toBe(false);
  });
});
