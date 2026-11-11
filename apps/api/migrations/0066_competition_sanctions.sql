-- Competition sanctions (ADR-0028): disciplinary decisions of the organizer on a Team or one
-- of its players. Rows are never deleted or edited: revoking writes the revocation columns
-- once on the same row, so the audit trail keeps who imposed it, who revoked it and why.

CREATE TABLE IF NOT EXISTS competition_sanctions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('team', 'player')),
  team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  player_profile_id TEXT REFERENCES player_profiles (id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (
    type IN ('warning', 'points_deduction', 'match_suspension', 'administrative_defeat')
  ),
  points_deducted INTEGER CHECK (points_deducted BETWEEN 1 AND 100),
  suspension_matches INTEGER CHECK (suspension_matches BETWEEN 1 AND 20),
  encounter_id TEXT,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  imposed_by_actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  imposed_at TIMESTAMPTZ NOT NULL,
  request_id TEXT NOT NULL,
  revoked_by_actor_id TEXT REFERENCES actors (id) ON DELETE RESTRICT,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT CHECK (char_length(revocation_reason) BETWEEN 3 AND 500),
  revocation_request_id TEXT,
  CHECK ((target_type = 'player') = (player_profile_id IS NOT NULL)),
  CHECK ((type = 'points_deduction') = (points_deducted IS NOT NULL)),
  CHECK ((type = 'match_suspension') = (suspension_matches IS NOT NULL)),
  CHECK ((type = 'administrative_defeat') = (encounter_id IS NOT NULL)),
  CHECK (type NOT IN ('points_deduction', 'administrative_defeat') OR target_type = 'team'),
  CHECK (
    (revoked_at IS NULL AND revoked_by_actor_id IS NULL AND revocation_reason IS NULL
      AND revocation_request_id IS NULL)
    OR (revoked_at IS NOT NULL AND revoked_by_actor_id IS NOT NULL
      AND revocation_reason IS NOT NULL AND revocation_request_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS competition_sanctions_competition_index
  ON competition_sanctions (organization_id, competition_id, imposed_at DESC);

CREATE INDEX IF NOT EXISTS competition_sanctions_team_index
  ON competition_sanctions (competition_id, team_id, imposed_at DESC);

-- UPDATE only records the first revocation and touches nothing else. DELETE is rejected
-- unless it runs as the cascade of a tenant, competition or Team delete.
CREATE OR REPLACE FUNCTION competition_sanctions_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() > 1 THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'competition_sanctions is append-only' USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD.revoked_at IS NOT NULL
    OR NEW.revoked_at IS NULL
    OR (to_jsonb(NEW) - ARRAY['revoked_by_actor_id', 'revoked_at', 'revocation_reason',
          'revocation_request_id'])
       IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['revoked_by_actor_id', 'revoked_at', 'revocation_reason',
          'revocation_request_id']) THEN
    RAISE EXCEPTION 'competition_sanctions only records one revocation'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS competition_sanctions_append_only ON competition_sanctions;
CREATE TRIGGER competition_sanctions_append_only
  BEFORE UPDATE OR DELETE ON competition_sanctions
  FOR EACH ROW EXECUTE FUNCTION competition_sanctions_append_only();
