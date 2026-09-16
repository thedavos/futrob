import { describe, expect, it } from "vite-plus/test";
import { rehydrateTeamContribution, type TeamContributionRow } from "./team-postgres-rows.ts";

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

  it("defaults legacy rows without a frozen mode to independent_matches", () => {
    expect(
      rehydrateTeamContribution(
        contributionRow({
          id: "result-1:1:1:home",
          resolution_mode: null,
        }),
      ).resolutionMode,
    ).toBe("independent_matches");
  });
});

function contributionRow(
  input: Pick<TeamContributionRow, "id" | "resolution_mode">,
): TeamContributionRow {
  return {
    id: input.id,
    official_result_id: "result-1",
    revision: 1,
    encounter_id: "encounter-1",
    competition_id: "competition-1",
    organization_id: "organization-1",
    official_slot: 1,
    team_id: "home-team",
    correlation_status: "matched",
    side: "home",
    external_club_id: "club-1",
    goals_for: 1,
    goals_against: 0,
    platform: "playstation",
    game_edition: "fc26",
    minutes_played: 90,
    goals: null,
    assists: null,
    shots: null,
    pass_attempts: null,
    passes_made: null,
    tackle_attempts: null,
    tackles_made: null,
    saves: null,
    yellow_cards: null,
    red_cards: null,
    is_mvp: null,
    rating: null,
    resolution_mode: input.resolution_mode,
  };
}
