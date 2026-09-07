ALTER TABLE roster_invitations
  ADD COLUMN IF NOT EXISTS invited_by_display_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS invited_by_gamertag TEXT NULL,
  ADD COLUMN IF NOT EXISTS invitee_actor_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS invitee_identifier TEXT NULL,
  ADD COLUMN IF NOT EXISTS message TEXT NULL,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ NULL;

ALTER TABLE roster_invitations DROP CONSTRAINT IF EXISTS roster_invitations_status_check;
ALTER TABLE roster_invitations
  ADD CONSTRAINT roster_invitations_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired'));

CREATE INDEX IF NOT EXISTS roster_invitations_invitee_actor_id_index
  ON roster_invitations (invitee_actor_id);
