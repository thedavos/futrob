import { describe, expect, it } from "vite-plus/test";
import { contributionRow, twoSlotSeriesRows } from "./team-contribution-row.fixture.ts";
import { rehydrateTeamContribution, rehydrateTeamContributions } from "./team-postgres-rows.ts";

describe("rehydrateTeamContribution", () => {
  it("prefers a resolution_mode column over the id suffix", () => {
    expect(
      rehydrateTeamContribution(
        contributionRow({
          id: "result-1:1:1:home:independent_matches",
          resolution_mode: "aggregate_score",
        }),
      ).resolutionMode,
    ).toBe("aggregate_score");
  });

  it("reads the frozen mode from the contribution id when the column is absent", () => {
    expect(
      rehydrateTeamContribution(
        contributionRow({
          id: "result-1:1:1:home:aggregate_score",
          resolution_mode: null,
        }),
      ).resolutionMode,
    ).toBe("aggregate_score");
  });

  it("uses frozen id suffix over a historical stage fallback", () => {
    expect(
      rehydrateTeamContribution(
        contributionRow({
          id: "result-1:1:1:home:independent_matches",
          resolution_mode: null,
        }),
        "aggregate_score",
      ).resolutionMode,
    ).toBe("independent_matches");
  });

  it("uses encounter stage rules when a pre-PR row has no frozen mode", () => {
    expect(
      rehydrateTeamContribution(
        contributionRow({
          id: "result-1:1:1:home",
          resolution_mode: null,
        }),
        "independent_matches",
      ).resolutionMode,
    ).toBe("independent_matches");
  });

  it("fails when a pre-PR row has no frozen mode and no encounter stage rules", () => {
    expect(() =>
      rehydrateTeamContribution(
        contributionRow({
          id: "result-1:1:1:home",
          resolution_mode: null,
        }),
      ),
    ).toThrow(/missing frozen resolutionMode and encounter stage rules/);
  });
});

describe("rehydrateTeamContributions", () => {
  it("does not infer aggregate_score from slot 2 when stage rules are independent", () => {
    const contributions = rehydrateTeamContributions(
      twoSlotSeriesRows(),
      new Map([["encounter-two-slot", "independent_matches"]]),
    );

    expect(contributions.map((row) => row.resolutionMode)).toEqual([
      "independent_matches",
      "independent_matches",
      "independent_matches",
      "independent_matches",
    ]);
  });
});
