CREATE INDEX IF NOT EXISTS competitions_discovery_status_updated_at_id_index
  ON competitions (status, updated_at DESC, id);
