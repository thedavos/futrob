-- Team range, end date and cover. Presets are ids the web maps to trophy illustrations;
-- uploads are R2 keys under competition-covers/{organization_id}/.
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS min_teams INTEGER NOT NULL DEFAULT 2
    CHECK (min_teams BETWEEN 2 AND 256),
  ADD COLUMN IF NOT EXISTS ends_on DATE NULL,
  ADD COLUMN IF NOT EXISTS cover_kind TEXT NOT NULL DEFAULT 'preset'
    CHECK (cover_kind IN ('preset', 'upload')),
  ADD COLUMN IF NOT EXISTS cover_value TEXT NOT NULL DEFAULT 'cup';

ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_team_range_check;
ALTER TABLE competitions
  ADD CONSTRAINT competitions_team_range_check
  CHECK (max_teams IS NULL OR max_teams >= min_teams);

ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_schedule_check;
ALTER TABLE competitions
  ADD CONSTRAINT competitions_schedule_check
  CHECK (starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on);
