CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  creation_key TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS teams_creation_key_unique
  ON teams (creation_key)
  WHERE creation_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS teams_organization_id_index
  ON teams (organization_id);

CREATE TABLE IF NOT EXISTS competition_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL,
  creation_key TEXT NULL,
  UNIQUE (competition_id, team_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS competition_entries_creation_key_unique
  ON competition_entries (creation_key)
  WHERE creation_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS competition_entries_organization_id_index
  ON competition_entries (organization_id);

CREATE TABLE IF NOT EXISTS competition_roster_memberships (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  player_profile_id TEXT NOT NULL REFERENCES player_profiles (id) ON DELETE CASCADE,
  game_account_id TEXT NULL REFERENCES player_game_accounts (id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('player', 'captain', 'vice_captain')),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (player_profile_id, competition_id)
);

CREATE INDEX IF NOT EXISTS competition_roster_memberships_team_index
  ON competition_roster_memberships (organization_id, competition_id, team_id);

CREATE INDEX IF NOT EXISTS competition_roster_memberships_player_index
  ON competition_roster_memberships (player_profile_id);

CREATE TABLE IF NOT EXISTS active_team_preferences (
  actor_id TEXT PRIMARY KEY,
  roster_membership_id TEXT NOT NULL REFERENCES competition_roster_memberships (id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL
);
