-- Auth, actors and BFF rate limits move from Cloudflare D1 into the product
-- Postgres (ADR-0021). apps/auth is the only writer of the auth_* tables,
-- actors and identity_subjects; apps/web only writes app_rate_limit_windows.
-- Better Auth models map to auth_* tables so the reserved word "user" is never
-- used as a table name.

CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS identity_subjects (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (provider, subject)
);

CREATE INDEX IF NOT EXISTS identity_subjects_actor_id_index
  ON identity_subjects (actor_id);

CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  user_id TEXT NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_index
  ON auth_sessions (user_id);

CREATE TABLE IF NOT EXISTS auth_accounts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  access_token TEXT NULL,
  refresh_token TEXT NULL,
  id_token TEXT NULL,
  access_token_expires_at TIMESTAMPTZ NULL,
  refresh_token_expires_at TIMESTAMPTZ NULL,
  scope TEXT NULL,
  password TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_accounts_user_id_index
  ON auth_accounts (user_id);

CREATE TABLE IF NOT EXISTS auth_verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_verifications_identifier_index
  ON auth_verifications (identifier);

-- Better Auth's own rate limiter (`rateLimit.storage = "database"`).
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  last_request BIGINT NOT NULL
);

-- BFF rate limits owned by apps/web (club search, invitation preview/accept).
CREATE TABLE IF NOT EXISTS app_rate_limit_windows (
  policy TEXT NOT NULL,
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('actor', 'ip')),
  subject_fingerprint TEXT NOT NULL,
  window_started_at BIGINT NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (policy, subject_kind, subject_fingerprint, window_started_at)
);

CREATE INDEX IF NOT EXISTS app_rate_limit_windows_started_at_index
  ON app_rate_limit_windows (window_started_at);
