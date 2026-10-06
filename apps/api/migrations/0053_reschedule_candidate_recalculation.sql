-- Results' checkpoint over the schedule change handoff (#112). One row per application whose
-- candidates were recalculated. The handoff stays in scheduling's append-only tables; a row
-- here only means Results converged for it, so a crash before this insert recalculates again.

CREATE TABLE IF NOT EXISTS encounter_candidate_recalculations (
  application_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  outcome TEXT NOT NULL
    CHECK (outcome IN ('associated', 'clubs_not_connected', 'provider_mismatch', 'encounter_not_found')),
  recalculated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS encounter_candidate_recalculations_applied_index
  ON encounter_candidate_recalculations (applied_at DESC);
