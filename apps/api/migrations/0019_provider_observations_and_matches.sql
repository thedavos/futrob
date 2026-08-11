CREATE TABLE IF NOT EXISTS raw_provider_observations (
  id TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  external_resource_id TEXT NOT NULL,
  endpoint_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  storage_ref TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  http_status INTEGER NULL,
  schema_version TEXT NOT NULL,
  UNIQUE (provider_key, resource_type, external_resource_id, payload_hash)
);

CREATE INDEX IF NOT EXISTS raw_provider_observations_resource_index
  ON raw_provider_observations (provider_key, resource_type, external_resource_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS provider_matches (
  id TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL,
  external_match_id TEXT NOT NULL,
  game_edition TEXT NOT NULL,
  platform TEXT NOT NULL,
  mode TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  home_external_club_id TEXT NOT NULL,
  home_name TEXT NOT NULL,
  home_goals INTEGER NOT NULL,
  away_external_club_id TEXT NOT NULL,
  away_name TEXT NOT NULL,
  away_goals INTEGER NOT NULL,
  players JSONB NOT NULL,
  metadata JSONB NOT NULL,
  UNIQUE (provider_key, external_match_id)
);

CREATE INDEX IF NOT EXISTS provider_matches_clubs_time_index
  ON provider_matches (provider_key, home_external_club_id, away_external_club_id, occurred_at);
