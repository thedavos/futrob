ALTER TABLE schedule_change_proposals ADD COLUMN response_deadline TIMESTAMPTZ;

UPDATE competition_rules
SET regular_stage = CASE WHEN regular_stage IS NULL THEN NULL ELSE
      jsonb_build_object('rescheduleProposalExpiryHours', 12) || regular_stage END,
    knockout_stage = CASE WHEN knockout_stage IS NULL THEN NULL ELSE
      jsonb_build_object('rescheduleProposalExpiryHours', 12) || knockout_stage END;

DROP TRIGGER schedule_change_proposals_append_only ON schedule_change_proposals;

-- Legacy proposals keep their original clock anchor, including already overdue proposals.
UPDATE schedule_change_proposals AS proposal
SET response_deadline = proposal.created_at + make_interval(hours => COALESCE((
  SELECT CASE
    WHEN rules.regular_stage IS NULL THEN (rules.knockout_stage->>'rescheduleProposalExpiryHours')::integer
    WHEN rules.knockout_stage IS NULL THEN (rules.regular_stage->>'rescheduleProposalExpiryHours')::integer
    WHEN stage.kind IN ('knockout', 'playoffs') THEN (rules.knockout_stage->>'rescheduleProposalExpiryHours')::integer
    WHEN stage.kind IN ('league', 'groups') THEN (rules.regular_stage->>'rescheduleProposalExpiryHours')::integer
    ELSE 12 END
  FROM schedule_change_requests AS request
  JOIN encounter_schedule_snapshots AS snapshot ON snapshot.encounter_id = request.encounter_id
    AND snapshot.organization_id = request.organization_id
  LEFT JOIN fixture_stages AS stage ON stage.id = snapshot.stage_id
    AND stage.organization_id = request.organization_id
    AND stage.competition_id = request.competition_id
  JOIN competition_rules AS rules ON rules.competition_id = request.competition_id
  WHERE request.id = proposal.request_id AND request.organization_id = proposal.organization_id
  ORDER BY rules.version DESC LIMIT 1
), 12));

ALTER TABLE schedule_change_proposals ALTER COLUMN response_deadline SET NOT NULL;
ALTER TABLE schedule_change_proposals ADD CONSTRAINT schedule_change_proposals_deadline_check
  CHECK (response_deadline > created_at AND response_deadline <= created_at + INTERVAL '72 hours');

CREATE TRIGGER schedule_change_proposals_append_only
  BEFORE UPDATE OR DELETE ON schedule_change_proposals
  FOR EACH ROW EXECUTE FUNCTION schedule_change_append_only();

ALTER TABLE schedule_change_requests DROP CONSTRAINT schedule_change_requests_status_check;
ALTER TABLE schedule_change_requests ADD CONSTRAINT schedule_change_requests_status_check
  CHECK (status IN ('open', 'accepted', 'rejected', 'cancelled', 'expired', 'escalated', 'resolved_by_organizer'));
ALTER TABLE schedule_change_command_receipts DROP CONSTRAINT schedule_change_command_receipts_command_type_check;
ALTER TABLE schedule_change_command_receipts ADD CONSTRAINT schedule_change_command_receipts_command_type_check
  CHECK (command_type IN ('accept', 'reject', 'counter', 'expire', 'resolve'));
ALTER TABLE schedule_change_command_receipts DROP CONSTRAINT schedule_change_command_receipts_resulting_status_check;
ALTER TABLE schedule_change_command_receipts ADD CONSTRAINT schedule_change_command_receipts_resulting_status_check
  CHECK (resulting_status IN ('open', 'accepted', 'rejected', 'cancelled', 'expired', 'escalated', 'resolved_by_organizer'));

DROP INDEX schedule_change_requests_active_slot_1_uidx;
DROP INDEX schedule_change_requests_active_slot_2_uidx;
CREATE UNIQUE INDEX schedule_change_requests_active_slot_1_uidx
  ON schedule_change_requests (organization_id, encounter_id)
  WHERE status IN ('open', 'escalated') AND (scope_type = 'entire_encounter' OR official_slot = 1);
CREATE UNIQUE INDEX schedule_change_requests_active_slot_2_uidx
  ON schedule_change_requests (organization_id, encounter_id)
  WHERE status IN ('open', 'escalated') AND (scope_type = 'entire_encounter' OR official_slot = 2);
CREATE INDEX schedule_change_proposals_deadline_index ON schedule_change_proposals (response_deadline, request_id);

CREATE TABLE schedule_change_actions (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('schedule_change_expired', 'schedule_change_resolved')),
  authority TEXT NOT NULL CHECK (authority IN ('system', 'organizer')),
  actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  from_version INTEGER NOT NULL CHECK (from_version >= 1),
  to_version INTEGER NOT NULL CHECK (to_version = from_version + 1),
  response_deadline TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL,
  outcome TEXT CHECK (outcome IN ('schedule_set', 'schedule_kept', 'walkover_intended')),
  reason TEXT,
  proposed_start_at TIMESTAMPTZ,
  winning_team_id TEXT REFERENCES teams (id) ON DELETE RESTRICT,
  FOREIGN KEY (request_id, organization_id) REFERENCES schedule_change_requests (id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id, request_id) REFERENCES schedule_change_proposals (id, request_id) ON DELETE CASCADE,
  UNIQUE (request_id, kind),
  UNIQUE (request_id, to_version),
  CHECK (
    (kind = 'schedule_change_expired' AND authority = 'system' AND outcome IS NULL AND reason IS NULL AND proposed_start_at IS NULL AND winning_team_id IS NULL AND processed_at >= response_deadline)
    OR
    (kind = 'schedule_change_resolved' AND authority = 'organizer' AND outcome IS NOT NULL AND char_length(btrim(reason)) > 0
      AND ((outcome = 'schedule_set' AND proposed_start_at IS NOT NULL AND proposed_start_at > processed_at AND winning_team_id IS NULL)
        OR (outcome = 'schedule_kept' AND proposed_start_at IS NULL AND winning_team_id IS NULL)
        OR (outcome = 'walkover_intended' AND proposed_start_at IS NULL AND winning_team_id IS NOT NULL)))
  )
);
CREATE TRIGGER schedule_change_actions_append_only
  BEFORE UPDATE OR DELETE ON schedule_change_actions
  FOR EACH ROW EXECUTE FUNCTION schedule_change_append_only();
