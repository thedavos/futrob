-- Per-account interface preferences, owned by identity. A missing row means defaults.

CREATE TABLE IF NOT EXISTS actor_preferences (
  actor_id TEXT PRIMARY KEY REFERENCES actors (id) ON DELETE CASCADE,
  sidebar_layout TEXT NOT NULL CHECK (sidebar_layout IN ('navigation', 'pending-queue')),
  updated_at TIMESTAMPTZ NOT NULL
);
