ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS normalized_name TEXT;

UPDATE organizations
SET normalized_name = LOWER(
  REGEXP_REPLACE(TRIM(NORMALIZE(name, NFKC)), '[[:space:]]+', ' ', 'g')
)
WHERE normalized_name IS NULL;

ALTER TABLE organizations
  ALTER COLUMN normalized_name SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_normalized_name_unique
  ON organizations (normalized_name);

ALTER TABLE organization_invitations
  ADD COLUMN IF NOT EXISTS competition_id TEXT NULL REFERENCES competitions (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS organization_invitations_competition_id_index
  ON organization_invitations (competition_id)
  WHERE competition_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS competition_memberships (
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'captain', 'player')),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (competition_id, actor_id)
);

CREATE INDEX IF NOT EXISTS competition_memberships_actor_id_index
  ON competition_memberships (actor_id);
