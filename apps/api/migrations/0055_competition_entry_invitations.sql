-- Entry invitations (ADR-0023): an organizer invites a player to bring a team, or shares
-- the competition's link. Accepting creates the Team, its approved entry and the captaincy.

CREATE TABLE IF NOT EXISTS competition_entry_invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('directed', 'link')),
  invitee_actor_id TEXT REFERENCES actors (id) ON DELETE RESTRICT,
  invitee_label TEXT,
  code TEXT UNIQUE,
  message TEXT CHECK (char_length(message) <= 280),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  invited_by_actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  accepted_entry_id TEXT REFERENCES competition_entries (id) ON DELETE SET NULL,
  CHECK (
    (channel = 'directed' AND invitee_actor_id IS NOT NULL AND code IS NULL)
    OR (channel = 'link' AND invitee_actor_id IS NULL AND code IS NOT NULL AND status IN ('pending', 'revoked'))
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS competition_entry_invitations_active_link_index
  ON competition_entry_invitations (competition_id)
  WHERE channel = 'link' AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS competition_entry_invitations_pending_invitee_index
  ON competition_entry_invitations (competition_id, invitee_actor_id)
  WHERE channel = 'directed' AND status = 'pending';

CREATE INDEX IF NOT EXISTS competition_entry_invitations_invitee_index
  ON competition_entry_invitations (invitee_actor_id, created_at DESC)
  WHERE invitee_actor_id IS NOT NULL;

ALTER TABLE activity_entries DROP CONSTRAINT IF EXISTS activity_entries_kind_check;
ALTER TABLE activity_entries ADD CONSTRAINT activity_entries_kind_check CHECK (
  kind IN (
    'match_dispute', 'selection_confirmation', 'roster_invitation', 'competition_published',
    'entry_invitation'
  )
);

ALTER TABLE activity_entries DROP CONSTRAINT IF EXISTS activity_entries_resource_type_check;
ALTER TABLE activity_entries ADD CONSTRAINT activity_entries_resource_type_check CHECK (
  resource_type IN ('encounter', 'roster_invitation', 'competition', 'entry_invitation')
);

ALTER TABLE activity_entries DROP CONSTRAINT IF EXISTS activity_entries_source_name_check;
ALTER TABLE activity_entries ADD CONSTRAINT activity_entries_source_name_check CHECK (
  source_name IN ('match_dispute', 'proposal', 'roster_invitation', 'competition', 'entry_invitation')
);
