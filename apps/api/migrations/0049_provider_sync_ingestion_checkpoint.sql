-- Game-data-owned handoff, committed atomically with raw observations and matches.
-- NULL means ingestion pending; [] means ingestion completed with no matches.
-- Only discovery descriptors are stored, not player observations or Results state.
ALTER TABLE provider_sync_jobs ADD COLUMN ingested_matches_json JSONB;
