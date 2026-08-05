ALTER TABLE competition_rules
  ADD COLUMN IF NOT EXISTS max_roster_size INTEGER NULL
    CHECK (max_roster_size IS NULL OR max_roster_size > 0),
  ADD COLUMN IF NOT EXISTS require_verified_external_club BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS competition_roster_states (
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ NULL,
  PRIMARY KEY (competition_id, team_id)
);

CREATE INDEX IF NOT EXISTS competition_roster_states_organization_id_index
  ON competition_roster_states (organization_id);

CREATE TABLE IF NOT EXISTS team_external_club_connections (
  team_id TEXT PRIMARY KEY REFERENCES teams (id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  external_club_id TEXT NOT NULL,
  external_club_name TEXT NOT NULL,
  game_edition TEXT NOT NULL,
  platform TEXT NOT NULL,
  verified_at TIMESTAMPTZ NULL,
  verified_by TEXT NULL
);

CREATE INDEX IF NOT EXISTS team_external_club_connections_provider_index
  ON team_external_club_connections (provider_key, external_club_id);
