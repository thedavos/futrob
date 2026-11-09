-- Cooldown lookups read the latest job for a dedupe key, including succeeded and dead rows.
-- The active unique index does not cover those statuses.
CREATE INDEX IF NOT EXISTS provider_sync_jobs_dedupe_latest
  ON provider_sync_jobs (organization_id, dedupe_key, created_at DESC);
