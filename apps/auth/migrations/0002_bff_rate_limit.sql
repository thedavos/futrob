CREATE TABLE IF NOT EXISTS app_rate_limit_windows (
  policy TEXT NOT NULL,
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('actor', 'ip')),
  subject_fingerprint TEXT NOT NULL,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (policy, subject_kind, subject_fingerprint, window_started_at)
);

CREATE INDEX IF NOT EXISTS app_rate_limit_windows_started_at_idx
  ON app_rate_limit_windows (window_started_at);
