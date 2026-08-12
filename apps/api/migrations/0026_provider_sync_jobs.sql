CREATE TABLE IF NOT EXISTS provider_sync_jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind = 'recent-matches'),
  input_json JSONB NOT NULL,
  dedupe_key TEXT NOT NULL,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('queued', 'running', 'retry_scheduled', 'succeeded', 'dead')
  ),
  attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  max_attempts INTEGER NOT NULL CHECK (max_attempts > 0),
  available_at TIMESTAMPTZ NULL,
  lease_token TEXT NULL,
  lease_expires_at TIMESTAMPTZ NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  last_error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_sync_jobs_active_dedupe
  ON provider_sync_jobs (organization_id, dedupe_key)
  WHERE status IN ('queued', 'running', 'retry_scheduled');

CREATE INDEX IF NOT EXISTS provider_sync_jobs_ready
  ON provider_sync_jobs (status, available_at, created_at);

CREATE INDEX IF NOT EXISTS provider_sync_jobs_expired_lease
  ON provider_sync_jobs (lease_expires_at)
  WHERE status = 'running';
