ALTER TABLE actor_onboarding
  ADD COLUMN IF NOT EXISTS onboarding_current_step TEXT NULL
    CHECK (
      onboarding_current_step IN (
        'intention',
        'game',
        'invitation',
        'game-account',
        'review'
      )
    );

UPDATE actor_onboarding
SET onboarding_current_step = 'intention'
WHERE onboarding_completed = FALSE
  AND onboarding_current_step IS NULL;

ALTER TABLE actor_onboarding
  DROP CONSTRAINT IF EXISTS actor_onboarding_check;

ALTER TABLE actor_onboarding
  ADD CONSTRAINT actor_onboarding_state_check CHECK (
    (
      onboarding_completed = FALSE
      AND onboarding_completed_at IS NULL
      AND onboarding_version IS NULL
      AND onboarding_current_step IS NOT NULL
      AND (
        (onboarding_path IS NULL AND onboarding_current_step = 'intention')
        OR (
          onboarding_path = 'organization'
          AND onboarding_current_step IN ('intention', 'game', 'review')
        )
        OR (
          onboarding_path = 'invitation'
          AND onboarding_current_step IN ('intention', 'invitation', 'review')
        )
        OR (
          onboarding_path = 'player'
          AND onboarding_current_step IN ('intention', 'game', 'game-account', 'review')
        )
      )
    )
    OR
    (
      onboarding_completed = TRUE
      AND onboarding_completed_at IS NOT NULL
      AND onboarding_version IS NOT NULL
      AND onboarding_version > 0
      AND onboarding_path IS NOT NULL
      AND onboarding_current_step IS NULL
    )
  );
