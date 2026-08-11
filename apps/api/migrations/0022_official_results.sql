CREATE TABLE IF NOT EXISTS official_match_selections (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  status TEXT NOT NULL,
  proposed_by_actor_id TEXT NOT NULL,
  proposed_at TIMESTAMPTZ NOT NULL,
  slots JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS official_match_selections_encounter_index
  ON official_match_selections (encounter_id, proposed_at DESC);

CREATE TABLE IF NOT EXISTS official_results (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'voided')),
  slots JSONB NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  approved_by TEXT NOT NULL,
  UNIQUE (encounter_id, revision)
);

CREATE INDEX IF NOT EXISTS official_results_approved_encounter_index
  ON official_results (encounter_id, status, revision DESC);
