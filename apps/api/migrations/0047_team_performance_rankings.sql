-- Separate from official standings and player ranking kinds. Keep old derivation versions.
CREATE TABLE team_performance_ranking_snapshots (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  competition_id TEXT NOT NULL REFERENCES competitions (id),
  formula_version TEXT NOT NULL,
  normalization_version TEXT NOT NULL,
  window_version TEXT NOT NULL,
  revision_fingerprint TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (organization_id, competition_id, formula_version, normalization_version, window_version)
);
CREATE INDEX team_performance_ranking_competition_idx
  ON team_performance_ranking_snapshots (competition_id, organization_id);
CREATE INDEX team_performance_contributions_scope_idx
  ON team_match_contributions (organization_id, competition_id, encounter_id, revision);
