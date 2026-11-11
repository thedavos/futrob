-- Retries of an email resend the request that first went out under its idempotency key
-- (ADR-0028): a provider that already accepted it answers with the same message id instead
-- of rejecting a different body. The request is pinned before the first send.

ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS message JSONB;

COMMENT ON COLUMN email_outbox.message IS
  'Rendered request sent under the delivery idempotency key; NULL until the first send.';
