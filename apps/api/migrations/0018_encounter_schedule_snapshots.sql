CREATE TABLE IF NOT EXISTS encounter_schedule_snapshots (
  encounter_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  home_team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  away_team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  official_match_count INTEGER NOT NULL CHECK (official_match_count IN (1, 2)),
  CHECK (home_team_id <> away_team_id)
);

CREATE INDEX IF NOT EXISTS encounter_schedule_competition_index
  ON encounter_schedule_snapshots (organization_id, competition_id, scheduled_start_at);
