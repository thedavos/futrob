CREATE TABLE IF NOT EXISTS fixture_plans (
  id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  status TEXT NOT NULL CHECK (status IN ('active', 'superseded')),
  generation_key TEXT NOT NULL,
  generation_fingerprint TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  rules_version INTEGER NOT NULL CHECK (rules_version >= 1),
  generation_version INTEGER NOT NULL CHECK (generation_version >= 1),
  format TEXT NOT NULL CHECK (
    format IN ('league', 'knockout', 'groups-knockout', 'league-playoffs')
  ),
  time_zone TEXT NOT NULL,
  home_and_away BOOLEAN NOT NULL,
  seed JSONB NOT NULL CHECK (jsonb_typeof(seed) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, competition_id, generation_version),
  UNIQUE (id, organization_id, competition_id)
);

CREATE TABLE IF NOT EXISTS fixture_stages (
  id TEXT PRIMARY KEY,
  fixture_plan_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  competition_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('league', 'groups', 'knockout', 'playoffs')),
  stage_order INTEGER NOT NULL CHECK (stage_order >= 1),
  UNIQUE (fixture_plan_id, stage_order),
  UNIQUE (id, fixture_plan_id),
  FOREIGN KEY (fixture_plan_id, organization_id, competition_id)
    REFERENCES fixture_plans (id, organization_id, competition_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fixture_rounds (
  id TEXT PRIMARY KEY,
  fixture_plan_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  competition_id TEXT NOT NULL,
  round_number INTEGER NOT NULL CHECK (round_number >= 1),
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  UNIQUE (stage_id, round_number),
  UNIQUE (id, fixture_plan_id, stage_id),
  FOREIGN KEY (fixture_plan_id, organization_id, competition_id)
    REFERENCES fixture_plans (id, organization_id, competition_id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id, fixture_plan_id)
    REFERENCES fixture_stages (id, fixture_plan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fixture_encounters (
  id TEXT PRIMARY KEY,
  fixture_plan_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  round_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  competition_id TEXT NOT NULL,
  encounter_order INTEGER NOT NULL CHECK (encounter_order >= 1),
  group_id TEXT,
  home_slot JSONB NOT NULL CHECK (
    home_slot->>'kind' IN ('team', 'bye', 'winner', 'group-rank', 'stage-rank')
  ),
  away_slot JSONB NOT NULL CHECK (
    away_slot->>'kind' IN ('team', 'bye', 'winner', 'group-rank', 'stage-rank')
  ),
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  official_match_count INTEGER NOT NULL CHECK (official_match_count IN (1, 2)),
  UNIQUE (round_id, encounter_order),
  UNIQUE (id, fixture_plan_id),
  FOREIGN KEY (fixture_plan_id, organization_id, competition_id)
    REFERENCES fixture_plans (id, organization_id, competition_id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id, fixture_plan_id)
    REFERENCES fixture_stages (id, fixture_plan_id) ON DELETE CASCADE,
  FOREIGN KEY (round_id, fixture_plan_id, stage_id)
    REFERENCES fixture_rounds (id, fixture_plan_id, stage_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS encounter_series (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL UNIQUE,
  fixture_plan_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  competition_id TEXT NOT NULL,
  resolution_mode TEXT NOT NULL CHECK (
    resolution_mode IN ('independent_matches', 'aggregate_score')
  ),
  official_match_count INTEGER NOT NULL CHECK (official_match_count IN (1, 2)),
  FOREIGN KEY (encounter_id, fixture_plan_id)
    REFERENCES fixture_encounters (id, fixture_plan_id) ON DELETE CASCADE,
  FOREIGN KEY (fixture_plan_id, organization_id, competition_id)
    REFERENCES fixture_plans (id, organization_id, competition_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fixture_encounter_audit (
  id BIGSERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  fixture_plan_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  UNIQUE (organization_id, competition_id, request_id),
  FOREIGN KEY (fixture_plan_id, organization_id, competition_id)
    REFERENCES fixture_plans (id, organization_id, competition_id) ON DELETE CASCADE,
  FOREIGN KEY (encounter_id, fixture_plan_id)
    REFERENCES fixture_encounters (id, fixture_plan_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS fixture_plans_active_index
  ON fixture_plans (organization_id, competition_id)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS fixture_encounters_schedule_index
  ON fixture_encounters (organization_id, competition_id, scheduled_start_at);
CREATE INDEX IF NOT EXISTS fixture_audit_tenant_index
  ON fixture_encounter_audit (organization_id, competition_id, encounter_id, occurred_at);
CREATE INDEX IF NOT EXISTS encounter_series_tenant_index
  ON encounter_series (organization_id, competition_id, encounter_id);
