CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'paused', 'finished', 'archived')),
  modality TEXT NOT NULL CHECK (modality = 'fc-clubs'),
  game_edition TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (
    platform IN ('playstation', 'xbox', 'pc', 'nintendo-switch-1', 'nintendo-switch-2')
  ),
  region TEXT NOT NULL CHECK (
    region IN (
      'south-america', 'north-central-america', 'europe', 'africa',
      'asia', 'middle-east', 'oceania'
    )
  ),
  time_zone TEXT NOT NULL,
  format TEXT NOT NULL CHECK (
    format IN ('league', 'knockout', 'groups-knockout', 'league-playoffs')
  ),
  created_by_actor_id TEXT NOT NULL,
  creation_key TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS competitions_creation_key_unique
  ON competitions (creation_key)
  WHERE creation_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS competitions_organization_id_index
  ON competitions (organization_id);

CREATE TABLE IF NOT EXISTS competition_rules (
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  regular_stage JSONB NULL,
  knockout_stage JSONB NULL,
  away_goals_enabled BOOLEAN NOT NULL DEFAULT FALSE CHECK (away_goals_enabled = FALSE),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (competition_id, version)
);

ALTER TABLE actor_onboarding
  DROP CONSTRAINT IF EXISTS actor_onboarding_onboarding_current_step_check;

ALTER TABLE actor_onboarding
  DROP CONSTRAINT IF EXISTS actor_onboarding_state_check;

ALTER TABLE actor_onboarding
  ADD CONSTRAINT actor_onboarding_onboarding_current_step_check CHECK (
    onboarding_current_step IN (
      'intention', 'organization', 'competition', 'game', 'invitation', 'game-account', 'review'
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
        OR (onboarding_path = 'organization' AND onboarding_current_step IN ('intention', 'organization', 'competition', 'game', 'game-account', 'review'))
        OR (onboarding_path = 'invitation' AND onboarding_current_step IN ('intention', 'invitation', 'game-account', 'review'))
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
