ALTER TABLE encounter_schedule_snapshots
  ADD COLUMN IF NOT EXISTS stage_id TEXT;

UPDATE encounter_schedule_snapshots
  SET stage_id = encounter_id || ':stage'
  WHERE stage_id IS NULL;

ALTER TABLE encounter_schedule_snapshots
  ALTER COLUMN stage_id SET NOT NULL;
