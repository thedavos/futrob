-- Swiss format (ADR-0027): rounds paired by reconciliation, withdrawal as a pairing fact of the
-- plan, encounters closed without a result and the organizer action trail.

ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_format_check;
ALTER TABLE competitions ADD CONSTRAINT competitions_format_check
  CHECK (format IN ('league', 'knockout', 'groups-knockout', 'league-playoffs', 'swiss'));

ALTER TABLE fixture_plans DROP CONSTRAINT IF EXISTS fixture_plans_format_check;
ALTER TABLE fixture_plans ADD CONSTRAINT fixture_plans_format_check
  CHECK (format IN ('league', 'knockout', 'groups-knockout', 'league-playoffs', 'swiss'));

ALTER TABLE fixture_stages DROP CONSTRAINT IF EXISTS fixture_stages_kind_check;
ALTER TABLE fixture_stages ADD CONSTRAINT fixture_stages_kind_check
  CHECK (kind IN ('league', 'groups', 'knockout', 'playoffs', 'swiss'));

ALTER TABLE fixture_plans
  ADD COLUMN IF NOT EXISTS withdrawn_team_ids JSONB NOT NULL DEFAULT '[]'
    CHECK (jsonb_typeof(withdrawn_team_ids) = 'array');

ALTER TABLE fixture_encounters
  ADD COLUMN IF NOT EXISTS closed_without_result BOOLEAN NOT NULL DEFAULT false;

-- Keyed by plan and without a foreign key to encounters: the trail must survive unpairing, which
-- deletes encounters, and one command touches several of them under a single request id.
CREATE TABLE IF NOT EXISTS swiss_round_actions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  fixture_plan_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('withdraw', 'close_round')),
  team_id TEXT,
  round_number INTEGER CHECK (round_number >= 1),
  actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (btrim(reason) <> ''),
  request_id TEXT NOT NULL CHECK (request_id <> ''),
  occurred_at TIMESTAMPTZ NOT NULL,
  UNIQUE (organization_id, competition_id, request_id),
  FOREIGN KEY (fixture_plan_id, organization_id, competition_id)
    REFERENCES fixture_plans (id, organization_id, competition_id) ON DELETE CASCADE,
  CHECK (
    (kind = 'withdraw' AND team_id IS NOT NULL AND round_number IS NULL)
    OR (kind = 'close_round' AND team_id IS NULL AND round_number IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS swiss_round_actions_plan_index
  ON swiss_round_actions (fixture_plan_id, occurred_at);

-- The catalog is data read per call (ADR-0025): append the format once and bump the version only
-- when the row changes, so an operator's manual edit or a re-run is not counted twice.
UPDATE billing_plans
SET entitlements = jsonb_set(
      entitlements,
      '{features,competitionFormats}',
      (entitlements #> '{features,competitionFormats}') || '["swiss"]'::jsonb
    ),
    version = version + 1,
    updated_at = NOW()
WHERE key IN ('pro', 'league')
  AND NOT (entitlements #> '{features,competitionFormats}') ? 'swiss';
