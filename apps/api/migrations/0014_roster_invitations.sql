CREATE TABLE IF NOT EXISTS roster_invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('player', 'captain', 'vice_captain')),
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by_actor_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by_actor_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  redeem_policy TEXT NOT NULL DEFAULT 'single' CHECK (redeem_policy IN ('single', 'multi'))
);

CREATE INDEX IF NOT EXISTS roster_invitations_team_id_index
  ON roster_invitations (team_id);

CREATE INDEX IF NOT EXISTS roster_invitations_competition_id_index
  ON roster_invitations (competition_id);
