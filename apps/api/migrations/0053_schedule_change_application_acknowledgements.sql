-- Per-consumer acknowledgements of the schedule change handoff (#112). A consumer lists the
-- applications it has not acknowledged, so one that commits late is still delivered: no
-- cursor or time window can skip it. A crash before the acknowledgement delivers it again.

CREATE TABLE IF NOT EXISTS schedule_change_application_acknowledgements (
  consumer TEXT NOT NULL CHECK (consumer <> ''),
  application_id TEXT NOT NULL REFERENCES schedule_change_applications (id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (consumer, application_id)
);

COMMENT ON TABLE schedule_change_application_acknowledgements IS
  'Applications each handoff consumer has handled. Rows without an acknowledgement for a consumer are pending for it.';
