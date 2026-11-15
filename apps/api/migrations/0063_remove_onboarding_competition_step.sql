ALTER TABLE actor_onboarding DROP CONSTRAINT actor_onboarding_onboarding_current_step_check;
ALTER TABLE actor_onboarding DROP CONSTRAINT actor_onboarding_state_check;

UPDATE actor_onboarding SET onboarding_current_step = 'organization'
WHERE onboarding_completed = FALSE AND onboarding_current_step = 'competition';

ALTER TABLE actor_onboarding
  ADD CONSTRAINT actor_onboarding_onboarding_current_step_check CHECK (
    onboarding_current_step IN (
      'intention',
      'organization',
      'invitation',
      'game-account',
      'club',
      'review'
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
        OR (
          onboarding_path = 'organization'
          AND onboarding_current_step IN (
            'intention',
            'organization',
                  'game-account',
            'review'
          )
        )
        OR (
          onboarding_path = 'invitation'
          AND onboarding_current_step IN (
            'intention',
            'invitation',
            'game-account',
            'review'
          )
        )
        OR (
          onboarding_path = 'player'
          AND onboarding_current_step IN (
            'intention',
            'game-account',
            'club',
            'review'
          )
        )
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
