-- Persisted eligibility of provider matches for an Encounter (results BC, DEC-023/024).
-- Score, clubs, players and raw payload stay in `provider_matches`; join on
-- (provider_key, external_match_id) when a projection needs observation fields.

CREATE TABLE IF NOT EXISTS encounter_candidates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  external_match_id TEXT NOT NULL,
  eligible BOOLEAN NOT NULL,
  associated_at TIMESTAMPTZ NOT NULL,
  last_evaluated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (organization_id, encounter_id, provider_key, external_match_id)
);

-- Compare-and-swap token for a full-set reconcile.
CREATE TABLE IF NOT EXISTS encounter_candidate_sets (
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL,
  generation INTEGER NOT NULL,
  PRIMARY KEY (organization_id, encounter_id)
);

CREATE INDEX IF NOT EXISTS encounter_candidates_encounter_eligible_index
  ON encounter_candidates (organization_id, encounter_id, eligible);
