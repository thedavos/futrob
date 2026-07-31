ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS creation_key TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_creation_key_unique
  ON organizations (creation_key)
  WHERE creation_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS player_profiles (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS player_game_accounts (
  id TEXT PRIMARY KEY,
  player_profile_id TEXT NOT NULL REFERENCES player_profiles (id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  normalized_identifier TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (
    platform IN (
      'playstation',
      'xbox',
      'pc',
      'nintendo-switch-1',
      'nintendo-switch-2'
    )
  ),
  game_edition TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (player_profile_id, normalized_identifier, platform, game_edition)
);

ALTER TABLE actor_onboarding
  DROP CONSTRAINT IF EXISTS actor_onboarding_onboarding_current_step_check;

ALTER TABLE actor_onboarding
  DROP CONSTRAINT IF EXISTS actor_onboarding_state_check;

UPDATE actor_onboarding
SET onboarding_current_step = 'organization'
WHERE onboarding_completed = FALSE
  AND onboarding_path = 'organization'
  AND onboarding_current_step = 'game';

UPDATE actor_onboarding
SET onboarding_current_step = 'game-account'
WHERE onboarding_completed = FALSE
  AND onboarding_path = 'player'
  AND onboarding_current_step = 'game';

ALTER TABLE actor_onboarding
  ADD CONSTRAINT actor_onboarding_onboarding_current_step_check CHECK (
    onboarding_current_step IN (
      'intention', 'organization', 'game', 'invitation', 'game-account', 'review'
    )
  );

ALTER TABLE actor_onboarding
  ADD CONSTRAINT actor_onboarding_state_check CHECK (
    (
      onboarding_completed = FALSE
      AND onboarding_completed_at IS NULL
      AND onboarding_version IS NULL
      AND onboarding_current_step IS NOT NULL
      AND (
        (onboarding_path IS NULL AND onboarding_current_step = 'intention')
        OR (onboarding_path = 'organization' AND onboarding_current_step IN ('intention', 'organization', 'game', 'review'))
        OR (onboarding_path = 'invitation' AND onboarding_current_step IN ('intention', 'invitation', 'review'))
        OR (onboarding_path = 'player' AND onboarding_current_step IN ('intention', 'game', 'game-account', 'review'))
      )
    )
    OR (
      onboarding_completed = TRUE
      AND onboarding_completed_at IS NOT NULL
      AND onboarding_version IS NOT NULL
      AND onboarding_version > 0
      AND onboarding_path IS NOT NULL
      AND onboarding_current_step IS NULL
    )
  );
