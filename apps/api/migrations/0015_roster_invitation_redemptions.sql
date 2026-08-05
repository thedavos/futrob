CREATE TABLE IF NOT EXISTS roster_invitation_redemptions (
  invitation_id TEXT NOT NULL REFERENCES roster_invitations (id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (invitation_id, actor_id)
);
