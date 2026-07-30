-- Product-owned onboarding state. Better Auth remains the identity/session
-- store; apps/api owns this state and references ActorIds as opaque strings.

CREATE TABLE IF NOT EXISTS actor_onboarding (
  actor_id TEXT PRIMARY KEY,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ NULL,
  onboarding_version INTEGER NULL,
  onboarding_path TEXT NULL
    CHECK (onboarding_path IN ('player', 'organization', 'invitation')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (
    (
      onboarding_completed = FALSE
      AND onboarding_completed_at IS NULL
      AND onboarding_version IS NULL
      AND onboarding_path IS NULL
    )
    OR
    (
      onboarding_completed = TRUE
      AND onboarding_completed_at IS NOT NULL
      AND onboarding_version IS NOT NULL
      AND onboarding_version > 0
      AND onboarding_path IS NOT NULL
    )
  )
);
