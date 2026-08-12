CREATE TABLE IF NOT EXISTS provider_response_cache (
  cache_key TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  value_json JSONB NULL,
  fresh_until TIMESTAMPTZ NULL,
  stale_until TIMESTAMPTZ NULL,
  refresh_token TEXT NULL,
  refresh_lease_expires_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS provider_response_cache_expiry
  ON provider_response_cache (provider_key, operation, fresh_until, stale_until);

CREATE TABLE IF NOT EXISTS provider_circuit_state (
  circuit_key TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('closed', 'open', 'half_open')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  opened_until TIMESTAMPTZ NULL,
  probe_lease_token TEXT NULL,
  probe_lease_expires_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
