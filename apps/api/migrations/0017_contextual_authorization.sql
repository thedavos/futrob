-- Contextual authorization: organization memberships become tenant-only,
-- while competition/roster roles remain in their owning tables.

ALTER TABLE organization_memberships
  DROP CONSTRAINT IF EXISTS organization_memberships_role_check;

UPDATE organization_memberships
SET role = 'member'
WHERE role IN ('captain', 'player');

ALTER TABLE organization_memberships
  ADD CONSTRAINT organization_memberships_role_check
  CHECK (role IN ('organizer', 'staff', 'member'));

ALTER TABLE organization_invitations
  DROP CONSTRAINT IF EXISTS organization_invitations_role_check;

UPDATE organization_invitations
SET role = 'member'
WHERE competition_id IS NULL
  AND role IN ('captain', 'player');

ALTER TABLE organization_invitations
  ADD CONSTRAINT organization_invitations_role_check CHECK (
    (competition_id IS NULL AND role IN ('staff', 'member'))
    OR
    (competition_id IS NOT NULL AND role IN ('staff', 'captain', 'player'))
  );

CREATE TABLE IF NOT EXISTS platform_role_assignments (
  actor_id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role = 'superuser'),
  assigned_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS authorization_grants (
  id TEXT PRIMARY KEY,
  organization_id TEXT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  scope_type TEXT NOT NULL CHECK (
    scope_type IN ('platform', 'organization', 'competition', 'team', 'encounter')
  ),
  scope_id TEXT NOT NULL,
  granted_by_actor_id TEXT NOT NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE NULLS NOT DISTINCT (organization_id, actor_id, permission, scope_type, scope_id),
  CHECK (
    (scope_type = 'platform' AND organization_id IS NULL)
    OR
    (scope_type <> 'platform' AND organization_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS authorization_grants_actor_scope_index
  ON authorization_grants (actor_id, scope_type, scope_id);

CREATE INDEX IF NOT EXISTS authorization_grants_organization_index
  ON authorization_grants (organization_id, actor_id);

CREATE TABLE IF NOT EXISTS authorization_audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_actor_id TEXT NOT NULL,
  organization_id TEXT NULL REFERENCES organizations (id) ON DELETE SET NULL,
  scope_type TEXT NOT NULL CHECK (
    scope_type IN ('platform', 'organization', 'competition', 'team', 'encounter')
  ),
  scope_id TEXT NOT NULL,
  permission TEXT NULL,
  before_value JSONB NULL,
  after_value JSONB NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS authorization_audit_organization_time_index
  ON authorization_audit_log (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS authorization_audit_actor_time_index
  ON authorization_audit_log (actor_id, created_at DESC);
