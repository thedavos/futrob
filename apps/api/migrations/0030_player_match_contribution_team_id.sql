ALTER TABLE player_match_contributions
ADD COLUMN team_id TEXT;

CREATE INDEX player_match_contributions_player_profile_team_idx
ON player_match_contributions (player_profile_id, team_id);
