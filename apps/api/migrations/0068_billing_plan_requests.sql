-- Manual plan purchase (ADR-0025, Phase 0): an organizer asks for a paid plan and a platform
-- superuser assigns it after billing happens outside the product. A request never changes
-- entitlements. Tenant rows are scoped by organization in the adapters; no RLS.

CREATE TABLE IF NOT EXISTS billing_plan_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL REFERENCES billing_plans (key),
  requested_by_actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'fulfilled', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  CHECK (plan_key <> 'free'),
  CHECK ((status = 'pending') = (resolved_at IS NULL))
);

-- At most one open request per organization; the use case supersedes before inserting.
CREATE UNIQUE INDEX IF NOT EXISTS billing_plan_requests_pending_unique
  ON billing_plan_requests (organization_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS billing_plan_requests_pending_queue
  ON billing_plan_requests (created_at, id) WHERE status = 'pending';
