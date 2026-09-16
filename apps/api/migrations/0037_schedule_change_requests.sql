CREATE TABLE IF NOT EXISTS schedule_change_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL,
  requesting_team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  initiated_by_actor_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('entire_encounter', 'official_match')),
  official_slot INTEGER NULL CHECK (
    (scope_type = 'entire_encounter' AND official_slot IS NULL)
    OR (scope_type = 'official_match' AND official_slot IN (1, 2))
  ),
  status TEXT NOT NULL CHECK (
    status IN ('open', 'accepted', 'rejected', 'cancelled', 'expired', 'escalated')
  ),
  idempotency_key TEXT NOT NULL CHECK (char_length(btrim(idempotency_key)) > 0),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (id, organization_id)
);

CREATE TABLE IF NOT EXISTS schedule_change_proposals (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  proposed_start_at TIMESTAMPTZ NOT NULL,
  proposed_by_actor_id TEXT NOT NULL,
  proposed_by_team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(btrim(reason)) > 0),
  created_at TIMESTAMPTZ NOT NULL,
  proposal_order INTEGER NOT NULL CHECK (proposal_order >= 1),
  UNIQUE (id, request_id),
  UNIQUE (request_id, proposal_order),
  FOREIGN KEY (request_id, organization_id)
    REFERENCES schedule_change_requests (id, organization_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS schedule_change_requests_idempotency_uidx
  ON schedule_change_requests (organization_id, idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS schedule_change_requests_active_slot_1_uidx
  ON schedule_change_requests (organization_id, encounter_id)
  WHERE status = 'open' AND (scope_type = 'entire_encounter' OR official_slot = 1);

CREATE UNIQUE INDEX IF NOT EXISTS schedule_change_requests_active_slot_2_uidx
  ON schedule_change_requests (organization_id, encounter_id)
  WHERE status = 'open' AND (scope_type = 'entire_encounter' OR official_slot = 2);

CREATE INDEX IF NOT EXISTS schedule_change_requests_encounter_status_index
  ON schedule_change_requests (organization_id, encounter_id, status);

CREATE INDEX IF NOT EXISTS schedule_change_proposals_request_index
  ON schedule_change_proposals (organization_id, request_id, proposal_order);

COMMENT ON TABLE schedule_change_requests IS
  'ScheduleChangeRequest aggregate root. Active uniqueness is per Encounter with entire vs OfficialMatch slot compatibility.';
COMMENT ON TABLE schedule_change_proposals IS
  'Ordered ScheduleChangeProposal history. The last row by proposal_order is the current proposal.';
