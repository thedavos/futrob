-- Schedule change negotiation: request version for CAS, decisions bound to one
-- proposal and version, and command receipts for replay. Proposals, decisions and
-- receipts are append-only; a request header is the only mutable row.
--
-- Backfill: existing requests start at version 1 with no decisions, which is
-- exactly their state since nothing could answer them before this migration.

ALTER TABLE schedule_change_requests
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'schedule_change_requests'::regclass
      AND conname = 'schedule_change_requests_version_check'
  ) THEN
    ALTER TABLE schedule_change_requests
      ADD CONSTRAINT schedule_change_requests_version_check CHECK (version >= 1);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS schedule_change_decisions (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  request_version INTEGER NOT NULL CHECK (request_version >= 1),
  kind TEXT NOT NULL CHECK (kind IN ('consent', 'rejection')),
  authority TEXT NOT NULL CHECK (authority IN ('rival_team', 'organizer')),
  team_id TEXT REFERENCES teams (id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  CHECK ((authority = 'rival_team') = (team_id IS NOT NULL)),
  FOREIGN KEY (request_id, organization_id)
    REFERENCES schedule_change_requests (id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id, request_id)
    REFERENCES schedule_change_proposals (id, request_id) ON DELETE CASCADE
);

-- One consent per authority and per actor for a given proposal.
CREATE UNIQUE INDEX IF NOT EXISTS schedule_change_decisions_authority_consent_uidx
  ON schedule_change_decisions (proposal_id, authority)
  WHERE kind = 'consent';

CREATE UNIQUE INDEX IF NOT EXISTS schedule_change_decisions_actor_consent_uidx
  ON schedule_change_decisions (proposal_id, actor_id)
  WHERE kind = 'consent';

CREATE INDEX IF NOT EXISTS schedule_change_decisions_request_index
  ON schedule_change_decisions (organization_id, request_id, request_version);

CREATE TABLE IF NOT EXISTS schedule_change_command_receipts (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  command_key TEXT NOT NULL CHECK (char_length(btrim(command_key)) > 0),
  command_type TEXT NOT NULL CHECK (command_type IN ('accept', 'reject', 'counter')),
  fingerprint TEXT NOT NULL,
  target_proposal_id TEXT NOT NULL,
  resulting_version INTEGER NOT NULL CHECK (resulting_version >= 2),
  resulting_status TEXT NOT NULL CHECK (
    resulting_status IN ('open', 'accepted', 'rejected', 'cancelled', 'expired', 'escalated')
  ),
  created_proposal_id TEXT,
  decision_id TEXT REFERENCES schedule_change_decisions (id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (request_id, organization_id)
    REFERENCES schedule_change_requests (id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (target_proposal_id, request_id)
    REFERENCES schedule_change_proposals (id, request_id) ON DELETE CASCADE,
  FOREIGN KEY (created_proposal_id, request_id)
    REFERENCES schedule_change_proposals (id, request_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS schedule_change_command_receipts_key_uidx
  ON schedule_change_command_receipts (organization_id, actor_id, command_key);

-- A request version is produced by exactly one command.
CREATE UNIQUE INDEX IF NOT EXISTS schedule_change_command_receipts_version_uidx
  ON schedule_change_command_receipts (request_id, resulting_version);

-- UPDATE is always rejected. DELETE only passes as the cascade of a tenant,
-- competition, Encounter snapshot or request delete (nested trigger depth).
CREATE OR REPLACE FUNCTION schedule_change_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schedule_change_proposals_append_only ON schedule_change_proposals;
CREATE TRIGGER schedule_change_proposals_append_only
  BEFORE UPDATE OR DELETE ON schedule_change_proposals
  FOR EACH ROW EXECUTE FUNCTION schedule_change_append_only();

DROP TRIGGER IF EXISTS schedule_change_decisions_append_only ON schedule_change_decisions;
CREATE TRIGGER schedule_change_decisions_append_only
  BEFORE UPDATE OR DELETE ON schedule_change_decisions
  FOR EACH ROW EXECUTE FUNCTION schedule_change_append_only();

DROP TRIGGER IF EXISTS schedule_change_command_receipts_append_only
  ON schedule_change_command_receipts;
CREATE TRIGGER schedule_change_command_receipts_append_only
  BEFORE UPDATE OR DELETE ON schedule_change_command_receipts
  FOR EACH ROW EXECUTE FUNCTION schedule_change_append_only();

COMMENT ON COLUMN schedule_change_requests.version IS
  'Negotiation version. Every accept/reject/counter increments it under compare-and-set.';
COMMENT ON TABLE schedule_change_decisions IS
  'Append-only consents and rejections, each bound to one proposal and the request version it answered.';
COMMENT ON TABLE schedule_change_command_receipts IS
  'Append-only negotiation command receipts keyed by (organization, actor, command_key) for replay.';
