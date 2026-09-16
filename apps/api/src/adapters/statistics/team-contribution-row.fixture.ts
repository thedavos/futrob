import type { TeamContributionRow } from "@/adapters/statistics/team-postgres-rows.ts";

export function twoSlotSeriesRows(): TeamContributionRow[] {
  return [
    contributionRow({
      id: "result-legacy:1:1:home",
      encounter_id: "encounter-two-slot",
      official_slot: 1,
      side: "home",
      team_id: "home-team",
      goals_for: 1,
      goals_against: 0,
      resolution_mode: null,
    }),
    contributionRow({
      id: "result-legacy:1:2:home",
      encounter_id: "encounter-two-slot",
      official_slot: 2,
      side: "home",
      team_id: "home-team",
      goals_for: 0,
      goals_against: 2,
      resolution_mode: null,
    }),
    contributionRow({
      id: "result-legacy:1:1:away",
      encounter_id: "encounter-two-slot",
      official_slot: 1,
      side: "away",
      team_id: "away-team",
      external_club_id: "club-2",
      goals_for: 0,
      goals_against: 1,
      resolution_mode: null,
    }),
    contributionRow({
      id: "result-legacy:1:2:away",
      encounter_id: "encounter-two-slot",
      official_slot: 2,
      side: "away",
      team_id: "away-team",
      external_club_id: "club-2",
      goals_for: 2,
      goals_against: 0,
      resolution_mode: null,
    }),
  ];
}

export function contributionRow(
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
