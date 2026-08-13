CREATE TABLE IF NOT EXISTS team_match_contributions (
  id TEXT PRIMARY KEY,
  official_result_id TEXT NOT NULL REFERENCES official_results (id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision > 0),
  encounter_id TEXT NOT NULL,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  official_slot INTEGER NOT NULL CHECK (official_slot IN (1, 2)),
  team_id TEXT NULL,
  correlation_status TEXT NOT NULL CHECK (correlation_status IN ('matched', 'unmatched')),
  side TEXT NOT NULL CHECK (side IN ('home', 'away')),
  external_club_id TEXT NOT NULL,
  goals_for INTEGER NOT NULL,
  goals_against INTEGER NOT NULL,
  platform TEXT NOT NULL,
  game_edition TEXT NOT NULL,
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
      AND team_id IS NOT NULL
    )
    OR
    (
      correlation_status = 'unmatched'
      AND team_id IS NULL
    )
  ),
  UNIQUE (official_result_id, revision, official_slot, side)
);

CREATE INDEX IF NOT EXISTS team_match_contributions_team_index
  ON team_match_contributions (team_id, competition_id);

CREATE INDEX IF NOT EXISTS team_match_contributions_competition_index
  ON team_match_contributions (competition_id);

CREATE TABLE IF NOT EXISTS team_competition_stats (
  team_id TEXT NOT NULL,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  matches_played INTEGER NOT NULL,
  minutes DOUBLE PRECISION NOT NULL,
  totals JSONB NOT NULL,
  averages JSONB NOT NULL,
  per90 JSONB NOT NULL,
  partial JSONB NOT NULL,
  source_revision_max INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (team_id, competition_id)
);

CREATE TABLE IF NOT EXISTS competition_standing_snapshots (
  competition_id TEXT PRIMARY KEY REFERENCES competitions (id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  formula_version TEXT NOT NULL,
  rows JSONB NOT NULL,
  source_revision_max INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
