CREATE TABLE IF NOT EXISTS player_match_contributions (
  id TEXT PRIMARY KEY,
  official_result_id TEXT NOT NULL REFERENCES official_results (id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision > 0),
  encounter_id TEXT NOT NULL,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  official_slot INTEGER NOT NULL CHECK (official_slot IN (1, 2)),
  player_profile_id TEXT NULL REFERENCES player_profiles (id),
  game_account_id TEXT NULL REFERENCES player_game_accounts (id),
  correlation_status TEXT NOT NULL CHECK (
    correlation_status IN ('matched', 'unmatched', 'ambiguous')
  ),
  external_player_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  external_club_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  game_edition TEXT NOT NULL,
  position TEXT NULL,
  minutes_played DOUBLE PRECISION NULL,
  goals DOUBLE PRECISION NULL,
  assists DOUBLE PRECISION NULL,
  shots DOUBLE PRECISION NULL,
  pass_attempts DOUBLE PRECISION NULL,
  passes_made DOUBLE PRECISION NULL,
  tackle_attempts DOUBLE PRECISION NULL,
  tackles_made DOUBLE PRECISION NULL,
  saves DOUBLE PRECISION NULL,
  yellow_cards DOUBLE PRECISION NULL,
  red_cards DOUBLE PRECISION NULL,
  is_mvp BOOLEAN NULL,
  rating DOUBLE PRECISION NULL,
  CHECK (
    (
      correlation_status = 'matched'
      AND player_profile_id IS NOT NULL
      AND game_account_id IS NOT NULL
    )
    OR
    (
      correlation_status IN ('unmatched', 'ambiguous')
      AND player_profile_id IS NULL
      AND game_account_id IS NULL
    )
  ),
  UNIQUE (official_result_id, revision, official_slot, external_player_id)
);

CREATE INDEX IF NOT EXISTS player_match_contributions_player_index
  ON player_match_contributions (player_profile_id, competition_id);

CREATE TABLE IF NOT EXISTS player_competition_stats (
  player_profile_id TEXT NOT NULL REFERENCES player_profiles (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (player_profile_id, competition_id)
);

CREATE TABLE IF NOT EXISTS player_personal_stats (
  player_profile_id TEXT PRIMARY KEY REFERENCES player_profiles (id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
