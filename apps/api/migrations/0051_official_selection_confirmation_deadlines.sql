-- Temporal metadata is separate so immutable proposals and their audit stay intact.
CREATE TABLE official_selection_confirmation_windows (
  proposal_id TEXT PRIMARY KEY REFERENCES official_selection_proposals (id) ON DELETE CASCADE,
  confirmation_deadline TIMESTAMPTZ NOT NULL
);

-- DEC-021 legacy treatment validated on 2026-10-05: retain the original anchor.
INSERT INTO official_selection_confirmation_windows (proposal_id, confirmation_deadline)
SELECT id, created_at + INTERVAL '24 hours' FROM official_selection_proposals;

CREATE INDEX official_selection_confirmation_windows_deadline_index
  ON official_selection_confirmation_windows (confirmation_deadline, proposal_id);

CREATE TRIGGER official_selection_confirmation_windows_append_only
  BEFORE UPDATE OR DELETE ON official_selection_confirmation_windows
  FOR EACH ROW EXECUTE FUNCTION official_selection_append_only();

ALTER TABLE official_selection_actions
  DROP CONSTRAINT official_selection_actions_action_type_check;
ALTER TABLE official_selection_actions
  ADD CONSTRAINT official_selection_actions_action_type_check CHECK (action_type IN (
    'proposed', 'confirmed', 'approved', 'integrity_review_required', 'rejected',
    'alternative_proposed', 'dispute_opened', 'review_started', 'dispute_resolved_approved',
    'returned_to_selection', 'voided', 'reference_reuse_rejected', 'legacy_review_required',
    'confirmation_expired'
  ));

CREATE UNIQUE INDEX official_selection_confirmation_expired_proposal_index
  ON official_selection_actions (proposal_id) WHERE action_type = 'confirmation_expired';
