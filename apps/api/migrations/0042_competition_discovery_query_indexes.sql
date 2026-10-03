-- Keyset ordering spans all discoverable statuses. Keep both sort keys aligned.
CREATE INDEX IF NOT EXISTS competitions_discovery_updated_id_index
  ON competitions (updated_at DESC, id DESC)
  WHERE status IN ('registration', 'published', 'paused', 'finished');

CREATE INDEX IF NOT EXISTS competitions_discovery_name_id_index
  ON competitions (lower(name), id)
  WHERE status IN ('registration', 'published', 'paused', 'finished');

-- Counts are scoped to a competition and tenant, never the entire entry catalogue.
CREATE INDEX IF NOT EXISTS competition_entries_approved_competition_index
  ON competition_entries (organization_id, competition_id)
  WHERE status = 'approved';
