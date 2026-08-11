CREATE UNIQUE INDEX IF NOT EXISTS encounter_schedule_identity_index
  ON encounter_schedule_snapshots (encounter_id, organization_id, competition_id);

CREATE TABLE IF NOT EXISTS official_matches (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  competition_id TEXT NOT NULL,
  slot INTEGER NOT NULL CHECK (slot IN (1, 2)),
  status TEXT NOT NULL CHECK (
    status IN ('scheduled', 'awaiting_selection', 'selected', 'completed', 'voided')
  ),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (encounter_id, slot),
  FOREIGN KEY (encounter_id, organization_id, competition_id)
    REFERENCES encounter_schedule_snapshots (encounter_id, organization_id, competition_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS official_matches_competition_index
  ON official_matches (organization_id, competition_id, encounter_id);
CREATE TABLE IF NOT EXISTS official_matches (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK (slot IN (1, 2)),
  status TEXT NOT NULL CHECK (
    status IN (
      'scheduled',
      'awaiting_selection',
      'selected',
      'completed',
      'voided'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (encounter_id, slot)
);

CREATE INDEX IF NOT EXISTS official_matches_encounter_index
  ON official_matches (organization_id, competition_id, encounter_id);
