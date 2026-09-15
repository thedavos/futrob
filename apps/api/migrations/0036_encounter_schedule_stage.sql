ALTER TABLE encounter_schedule_snapshots
  ADD COLUMN IF NOT EXISTS stage_id TEXT;

-- Real stage ids are `${planId}:stage:${stageOrder}` from fixture_stages / fixture_encounters.
-- Never invent `encounter_id || ':stage'`.
UPDATE encounter_schedule_snapshots AS snapshot
SET stage_id = fixture.stage_id
FROM fixture_encounters AS fixture
WHERE snapshot.stage_id IS NULL
  AND fixture.id = snapshot.encounter_id;

-- Orphans without a fixture_encounters row stay NULL until a later snapshot rewrite
-- can attach a real stage id. Do not SET NOT NULL on this cut.

COMMENT ON COLUMN encounter_schedule_snapshots.stage_id IS
  'Fixture stage id (`${planId}:stage:${stageOrder}`). NULL only for snapshots that cannot join fixture_encounters.';
