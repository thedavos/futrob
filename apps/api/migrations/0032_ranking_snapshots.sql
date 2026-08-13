CREATE TABLE IF NOT EXISTS ranking_snapshots (
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('scorer', 'assister', 'rating', 'mvp', 'goalkeeper')),
  formula_version TEXT NOT NULL,
  eligibility JSONB NOT NULL,
  rows JSONB NOT NULL,
  source_revision_max INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (competition_id, kind)
);

CREATE INDEX IF NOT EXISTS ranking_snapshots_organization_index
  ON ranking_snapshots (organization_id, competition_id);
