-- Applying an accepted schedule change (#122): a durable start per OfficialMatch slot and
-- an append-only application history, which is also the recoverable recalculation handoff.
--
-- Backfill: every existing slot starts at its Encounter's start. No offset between slot 1 and
-- slot 2 is invented. From here on the Encounter start is its earliest slot.

ALTER TABLE official_matches ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ;

UPDATE official_matches AS slot
SET scheduled_start_at = encounter.scheduled_start_at
FROM encounter_schedule_snapshots AS encounter
WHERE slot.encounter_id = encounter.encounter_id
  AND slot.scheduled_start_at IS NULL;

ALTER TABLE official_matches ALTER COLUMN scheduled_start_at SET NOT NULL;

-- Before this migration nothing applied an accepted request, so an accepted request has no
-- schedule to record. Refuse to guess one.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schedule_change_requests WHERE status = 'accepted') THEN
    RAISE EXCEPTION 'accepted schedule change requests exist without an applied schedule; resolve them before 0052';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS schedule_change_applications (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  request_version INTEGER NOT NULL CHECK (request_version >= 2),
  applied_by_actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  previous_encounter_start_at TIMESTAMPTZ NOT NULL,
  applied_encounter_start_at TIMESTAMPTZ NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (request_id, organization_id)
    REFERENCES schedule_change_requests (id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id, request_id)
    REFERENCES schedule_change_proposals (id, request_id) ON DELETE CASCADE,
  UNIQUE (id, request_id)
);

-- A request applies its schedule at most once.
CREATE UNIQUE INDEX IF NOT EXISTS schedule_change_applications_request_uidx
  ON schedule_change_applications (request_id);

CREATE INDEX IF NOT EXISTS schedule_change_applications_handoff_index
  ON schedule_change_applications (organization_id, applied_at, id);

CREATE TABLE IF NOT EXISTS schedule_change_application_slots (
  application_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  slot INTEGER NOT NULL CHECK (slot IN (1, 2)),
  previous_start_at TIMESTAMPTZ NOT NULL,
  applied_start_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (application_id, slot),
  FOREIGN KEY (application_id, request_id)
    REFERENCES schedule_change_applications (id, request_id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS schedule_change_applications_append_only ON schedule_change_applications;
CREATE TRIGGER schedule_change_applications_append_only
  BEFORE UPDATE OR DELETE ON schedule_change_applications
  FOR EACH ROW EXECUTE FUNCTION schedule_change_append_only();

DROP TRIGGER IF EXISTS schedule_change_application_slots_append_only
  ON schedule_change_application_slots;
CREATE TRIGGER schedule_change_application_slots_append_only
  BEFORE UPDATE OR DELETE ON schedule_change_application_slots
  FOR EACH ROW EXECUTE FUNCTION schedule_change_append_only();

COMMENT ON COLUMN official_matches.scheduled_start_at IS
  'Start of this OfficialMatch slot. Backfilled from the Encounter start; an official_match reschedule moves only its slot.';
COMMENT ON TABLE schedule_change_applications IS
  'Append-only schedule applied by an accepted request, committed with the new slot starts. Consumers of the recalculation handoff (#112) keep their own checkpoint; rows are never updated.';
COMMENT ON TABLE schedule_change_application_slots IS
  'Append-only before/after start of each OfficialMatch slot an application moved.';
