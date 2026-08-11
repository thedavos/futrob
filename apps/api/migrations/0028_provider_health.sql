CREATE TABLE IF NOT EXISTS provider_health_events (
  id TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (
    outcome IN (
      'success', 'timeout', 'network', 'rate_limited', 'upstream_4xx',
      'upstream_5xx', 'schema', 'circuit_open', 'circuit_half_open',
      'cache_hit', 'cache_miss', 'cache_stale'
    )
  ),
  latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  request_id TEXT NULL,
  job_id TEXT NULL
);

CREATE INDEX IF NOT EXISTS provider_health_events_provider_time
  ON provider_health_events (provider_key, occurred_at DESC);
