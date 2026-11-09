-- Billing (ADR-0025): plan catalog as data, one subscription per subject, an
-- append-only plan change audit (NFR-05) and an idempotent quota ledger. Tenant rows are
-- scoped by organization in the adapters; no RLS.

CREATE TABLE IF NOT EXISTS billing_plans (
  key TEXT PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]*$'),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('organization', 'actor')),
  version INTEGER NOT NULL CHECK (version >= 1),
  -- Limits, quotas and features. `null` limits mean unlimited. Editing this row changes
  -- enforcement without a deploy; bump `version` with it.
  entitlements JSONB NOT NULL CHECK (jsonb_typeof(entitlements) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (key, subject_type)
);

-- Sync allowances are cost hypotheses: free 60, pro 600 and league 5000 (fair use) per month.
INSERT INTO billing_plans (key, subject_type, version, entitlements) VALUES
  ('free', 'organization', 1, '{"limits":{"activeCompetitions":1,"teamsPerCompetition":12,"staffMembers":2},"quotas":{"provider_sync_jobs":{"amount":60,"period":"calendar_month_utc","fairUse":false}},"features":{"competitionFormats":["league","knockout"],"automaticProviderSync":false,"priorityProviderSync":false,"performanceRanking":false,"premiumAnalytics":false,"organizerAnalytics":"none","portalBranding":"futrob","notificationChannels":["web"]}}'::jsonb),
  ('pro', 'organization', 1, '{"limits":{"activeCompetitions":5,"teamsPerCompetition":32,"staffMembers":10},"quotas":{"provider_sync_jobs":{"amount":600,"period":"calendar_month_utc","fairUse":false}},"features":{"competitionFormats":["league","knockout","groups-knockout","league-playoffs"],"automaticProviderSync":true,"priorityProviderSync":false,"performanceRanking":true,"premiumAnalytics":true,"organizerAnalytics":"basic","portalBranding":"logo_colors","notificationChannels":["web","email"]}}'::jsonb),
  ('league', 'organization', 1, '{"limits":{"activeCompetitions":null,"teamsPerCompetition":null,"staffMembers":null},"quotas":{"provider_sync_jobs":{"amount":5000,"period":"calendar_month_utc","fairUse":true}},"features":{"competitionFormats":["league","knockout","groups-knockout","league-playoffs"],"automaticProviderSync":true,"priorityProviderSync":true,"performanceRanking":true,"premiumAnalytics":true,"organizerAnalytics":"full","portalBranding":"advanced","notificationChannels":["web","email","announcements"]}}'::jsonb),
  ('player_premium', 'actor', 1, '{"playerPremiumInsights":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('organization', 'actor')),
  organization_id TEXT REFERENCES organizations (id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES actors (id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at TIMESTAMPTZ,
  past_due_since TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  -- An organization subscribes to an organization plan; an actor to an add-on.
  FOREIGN KEY (plan_key, subject_type) REFERENCES billing_plans (key, subject_type),
  CHECK (
    (subject_type = 'organization' AND organization_id IS NOT NULL AND actor_id IS NULL)
    OR (subject_type = 'actor' AND actor_id IS NOT NULL AND organization_id IS NULL)
  ),
  CHECK ((status = 'trialing') = (trial_ends_at IS NOT NULL)),
  CHECK ((status = 'past_due') = (past_due_since IS NOT NULL)),
  CHECK ((status = 'canceled') = (canceled_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_organization_unique
  ON billing_subscriptions (organization_id) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_actor_unique
  ON billing_subscriptions (actor_id) WHERE actor_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS billing_plan_changes (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('organization', 'actor')),
  organization_id TEXT REFERENCES organizations (id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES actors (id) ON DELETE CASCADE,
  changed_by_actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  before_json JSONB,
  after_json JSONB NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  occurred_at TIMESTAMPTZ NOT NULL,
  CHECK (
    (subject_type = 'organization' AND organization_id IS NOT NULL AND actor_id IS NULL)
    OR (subject_type = 'actor' AND actor_id IS NOT NULL AND organization_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS billing_plan_changes_organization_index
  ON billing_plan_changes (organization_id, occurred_at DESC, id DESC)
  WHERE organization_id IS NOT NULL;

-- One row per consumed unit; the primary key makes a replayed usage key a no-op.
CREATE TABLE IF NOT EXISTS billing_quota_consumptions (
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  quota_key TEXT NOT NULL CHECK (quota_key IN ('provider_sync_jobs')),
  usage_key TEXT NOT NULL CHECK (usage_key <> ''),
  period_key TEXT NOT NULL CHECK (period_key ~ '^[0-9]{4}-[0-9]{2}$'),
  consumed_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (organization_id, quota_key, usage_key)
);

CREATE INDEX IF NOT EXISTS billing_quota_consumptions_period_index
  ON billing_quota_consumptions (organization_id, quota_key, period_key);
