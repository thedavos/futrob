CREATE INDEX IF NOT EXISTS encounter_schedule_home_start_index
  ON encounter_schedule_snapshots (home_team_id, scheduled_start_at);

CREATE INDEX IF NOT EXISTS encounter_schedule_away_start_index
  ON encounter_schedule_snapshots (away_team_id, scheduled_start_at);
