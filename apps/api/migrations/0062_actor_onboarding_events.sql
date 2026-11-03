CREATE TABLE actor_onboarding_events (
  id BIGSERIAL PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('step-entered', 'completed')),
  onboarding_path TEXT CHECK (onboarding_path IN ('player', 'organization', 'invitation')),
  onboarding_step TEXT,
  onboarding_version INTEGER NOT NULL CHECK (onboarding_version > 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  CHECK (
    (kind = 'step-entered' AND onboarding_step IS NOT NULL)
    OR (kind = 'completed' AND onboarding_path IS NOT NULL AND onboarding_step IS NULL)
  )
);

CREATE INDEX actor_onboarding_events_occurred_at_idx
  ON actor_onboarding_events (occurred_at);

CREATE INDEX actor_onboarding_events_actor_idx
  ON actor_onboarding_events (actor_id, occurred_at);
