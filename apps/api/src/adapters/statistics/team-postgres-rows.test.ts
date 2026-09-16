import { describe, expect, it } from "vite-plus/test";
import {
  rehydrateTeamContribution,
  rehydrateTeamContributions,
  type TeamContributionRow,
} from "./team-postgres-rows.ts";

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

  it("defaults a single-slot pre-PR row to independent_matches", () => {
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

describe("rehydrateTeamContributions", () => {
  it("infers aggregate_score for pre-PR two-leg ids so a series is one PJ", () => {
    const contributions = rehydrateTeamContributions([
      contributionRow({
        id: "result-ko:1:1:home",
        encounter_id: "encounter-knockout",
        official_slot: 1,
        side: "home",
        team_id: "home-team",
        goals_for: 1,
        goals_against: 0,
        resolution_mode: null,
      }),
      contributionRow({
        id: "result-ko:1:2:home",
        encounter_id: "encounter-knockout",
        official_slot: 2,
        side: "home",
        team_id: "home-team",
        goals_for: 0,
        goals_against: 2,
        resolution_mode: null,
      }),
      contributionRow({
        id: "result-ko:1:1:away",
        encounter_id: "encounter-knockout",
        official_slot: 1,
        side: "away",
        team_id: "away-team",
        external_club_id: "club-2",
        goals_for: 0,
        goals_against: 1,
        resolution_mode: null,
      }),
      contributionRow({
        id: "result-ko:1:2:away",
        encounter_id: "encounter-knockout",
        official_slot: 2,
        side: "away",
        team_id: "away-team",
        external_club_id: "club-2",
        goals_for: 2,
        goals_against: 0,
        resolution_mode: null,
      }),
    ]);

    expect(contributions.map((row) => row.resolutionMode)).toEqual([
      "aggregate_score",
      "aggregate_score",
      "aggregate_score",
      "aggregate_score",
    ]);
  });
});

function contributionRow(
  input: Partial<TeamContributionRow> & Pick<TeamContributionRow, "id">,
): TeamContributionRow {
  return {
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
    resolution_mode: null,
    ...input,
  };
}
