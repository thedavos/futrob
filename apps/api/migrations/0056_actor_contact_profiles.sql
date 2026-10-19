-- Identity-owned contact projection. apps/auth is the only writer.
-- This statement is the migration's one read of auth_users. DISTINCT ON keeps
-- a single credential subject per actor: latest auth_users.updated_at, then subject.

CREATE TABLE IF NOT EXISTS actor_contact_profiles (
  actor_id TEXT PRIMARY KEY REFERENCES actors (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

INSERT INTO actor_contact_profiles (actor_id, display_name, email, updated_at)
SELECT DISTINCT ON (identity_subjects.actor_id)
  identity_subjects.actor_id,
  auth_users.name,
  auth_users.email,
  auth_users.updated_at
FROM identity_subjects
INNER JOIN auth_users ON auth_users.id = identity_subjects.subject
WHERE identity_subjects.provider = 'credential'
ORDER BY identity_subjects.actor_id, auth_users.updated_at DESC, identity_subjects.subject ASC
ON CONFLICT (actor_id) DO NOTHING;
