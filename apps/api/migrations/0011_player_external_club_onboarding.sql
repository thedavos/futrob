CREATE TABLE IF NOT EXISTS player_external_club_associations (
  player_profile_id TEXT PRIMARY KEY REFERENCES player_profiles (id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  external_club_id TEXT NOT NULL,
  external_club_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  game_edition TEXT NOT NULL,
  associated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS player_external_club_associations_provider_club_idx
  ON player_external_club_associations (provider_key, external_club_id);

ALTER TABLE actor_onboarding
  DROP CONSTRAINT IF EXISTS actor_onboarding_onboarding_current_step_check;

ALTER TABLE actor_onboarding
  DROP CONSTRAINT IF EXISTS actor_onboarding_state_check;

ALTER TABLE actor_onboarding
  ADD CONSTRAINT actor_onboarding_onboarding_current_step_check CHECK (
    onboarding_current_step IN (
      'intention',
      'organization',
      'competition',
      'game',
      'invitation',
      'game-account',
      'team',
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
            'competition',
            'game',
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
            'game',
            'game-account',
            'team',
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
