-- Email channel (ADR-0008, ADR-0031). The notifications repository writes email_outbox
-- inside the transaction of the command that produced the fact; a separate runner sends.

CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL CHECK (event_id <> ''),
  channel TEXT NOT NULL CHECK (channel = 'email'),
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  recipient_actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE CASCADE,
  template TEXT NOT NULL CHECK (
    template IN (
      'registration', 'upcoming_match', 'reschedule', 'ea_candidates',
      'proposed_selection', 'result_or_dispute', 'organizer_decision', 'sanction'
    )
  ),
  intent JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL,
  last_error TEXT,
  skip_reason TEXT CHECK (skip_reason IN ('plan_without_email', 'opted_out', 'no_address')),
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  CHECK ((status = 'pending') = (settled_at IS NULL)),
  CHECK ((status = 'skipped') = (skip_reason IS NOT NULL)),
  CHECK (status <> 'sent' OR provider_message_id IS NOT NULL),
  UNIQUE (event_id, channel, recipient_actor_id)
);

CREATE INDEX IF NOT EXISTS email_outbox_due_index
  ON email_outbox (next_attempt_at, id)
  WHERE status = 'pending';

COMMENT ON TABLE email_outbox IS
  'One email per fact, channel and recipient. Only the notifications repository writes it.';

CREATE TABLE IF NOT EXISTS notification_email_preferences (
  actor_id TEXT PRIMARY KEY REFERENCES actors (id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('es', 'en')),
  non_critical_email BOOLEAN NOT NULL,
  unsubscribe_token TEXT NOT NULL UNIQUE CHECK (length(unsubscribe_token) >= 32),
  updated_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE notification_email_preferences IS
  'Email locale and non-critical opt-out per actor. A missing row means defaults.';
