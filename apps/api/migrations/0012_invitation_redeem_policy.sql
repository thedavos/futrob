-- Multi-redemption access invitations (Acceso 1:N): a `redeemPolicy: multi`
-- invitation lets up to `max_redemptions` distinct actors redeem the same
-- token. `single` keeps today's 1:1 semantics unchanged.

ALTER TABLE organization_invitations
  ADD COLUMN IF NOT EXISTS redeem_policy TEXT NOT NULL DEFAULT 'single'
    CHECK (redeem_policy IN ('single', 'multi')),
  ADD COLUMN IF NOT EXISTS max_redemptions INTEGER NULL
    CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  ADD COLUMN IF NOT EXISTS redeemed_count INTEGER NOT NULL DEFAULT 0
    CHECK (redeemed_count >= 0);

ALTER TABLE organization_invitations
  ADD CONSTRAINT organization_invitations_redeem_policy_shape CHECK (
    (redeem_policy = 'single' AND max_redemptions IS NULL)
    OR (redeem_policy = 'multi' AND max_redemptions IS NOT NULL)
  );

-- Per-actor redemption ledger backing the `multi` CAS claim and idempotent
-- re-redeem by the same actor. `single` invitations do not use this table.
CREATE TABLE IF NOT EXISTS organization_invitation_redemptions (
  invitation_id TEXT NOT NULL REFERENCES organization_invitations (id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (invitation_id, actor_id)
);

CREATE INDEX IF NOT EXISTS organization_invitation_redemptions_invitation_id_idx
  ON organization_invitation_redemptions (invitation_id);
