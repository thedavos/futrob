-- Organizations tenancy (apps/api / Postgres). ActorIds are opaque strings
-- issued by apps/web Better Auth provisioning — this schema does not FK them.

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by_actor_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('organizer', 'staff', 'captain', 'player')),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (organization_id, actor_id)
);

CREATE INDEX IF NOT EXISTS organization_memberships_actor_id_idx
  ON organization_memberships (actor_id);

CREATE TABLE IF NOT EXISTS organization_invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('staff', 'captain', 'player')),
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by_actor_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by_actor_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS organization_invitations_org_id_idx
  ON organization_invitations (organization_id);
