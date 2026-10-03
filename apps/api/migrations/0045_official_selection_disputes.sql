-- Official selection negotiation: versioned selections, immutable proposals, an
-- append-only audit trail, disputes and globally unique provider-match claims.
--
-- `official_match_selections` becomes the negotiation aggregate of one Encounter.
-- The legacy columns `slots`, `proposed_by_actor_id` and `proposed_at` stay in the
-- table but are no longer required: new rows leave them NULL (slots and proposer now
-- live on `official_selection_proposals`). Legacy live rows keep their values.

-- 1. Selection aggregate columns --------------------------------------------------

ALTER TABLE official_match_selections
  ADD COLUMN IF NOT EXISTS organization_id TEXT,
  ADD COLUMN IF NOT EXISTS competition_id TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS round INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_proposal_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

ALTER TABLE official_match_selections
  ALTER COLUMN slots DROP NOT NULL,
  ALTER COLUMN proposed_by_actor_id DROP NOT NULL,
  ALTER COLUMN proposed_at DROP NOT NULL;

-- Tenant scope comes from the schedule snapshot of the Encounter.
UPDATE official_match_selections selection
SET organization_id = snapshot.organization_id,
    competition_id = snapshot.competition_id
FROM encounter_schedule_snapshots snapshot
WHERE snapshot.encounter_id = selection.encounter_id
  AND selection.superseded_at IS NULL
  AND selection.organization_id IS NULL;

-- Several legacy rows for one Encounter: the most recent stays live, older ones are
-- superseded. Rows without a schedule snapshot have no tenant and are superseded too.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY encounter_id
           ORDER BY proposed_at DESC NULLS LAST, id DESC
         ) AS position
  FROM official_match_selections
  WHERE superseded_at IS NULL
)
UPDATE official_match_selections selection
SET superseded_at = NOW()
FROM ranked
WHERE ranked.id = selection.id
  AND (ranked.position > 1 OR selection.organization_id IS NULL);

UPDATE official_match_selections
SET created_at = proposed_at,
    updated_at = proposed_at
WHERE created_at IS NULL;

ALTER TABLE official_match_selections
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'official_match_selections'::regclass
      AND conname = 'official_match_selections_live_tenant_check'
  ) THEN
    ALTER TABLE official_match_selections
      ADD CONSTRAINT official_match_selections_live_tenant_check
      CHECK (
        superseded_at IS NOT NULL
        OR (organization_id IS NOT NULL AND competition_id IS NOT NULL)
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'official_match_selections'::regclass
      AND conname = 'official_match_selections_organization_id_fkey'
  ) THEN
    ALTER TABLE official_match_selections
      ADD CONSTRAINT official_match_selections_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'official_match_selections'::regclass
      AND conname = 'official_match_selections_competition_id_fkey'
  ) THEN
    ALTER TABLE official_match_selections
      ADD CONSTRAINT official_match_selections_competition_id_fkey
      FOREIGN KEY (competition_id) REFERENCES competitions (id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS official_match_selections_live_encounter_index
  ON official_match_selections (encounter_id)
  WHERE superseded_at IS NULL;

-- 2. Proposals (immutable) ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS official_selection_proposals (
  id TEXT PRIMARY KEY,
  selection_id TEXT NOT NULL REFERENCES official_match_selections (id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  -- NULL only for rows migrated from before Team attribution existed.
  proposing_team_id TEXT,
  proposed_by_actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  slots JSONB NOT NULL,
  supersedes_proposal_id TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (selection_id, sequence)
);

-- 3. Audit actions (append-only) -----------------------------------------------------

CREATE TABLE IF NOT EXISTS official_selection_actions (
  seq BIGSERIAL NOT NULL,
  id TEXT PRIMARY KEY,
  -- NULL only for an attempt that never produced a selection.
  selection_id TEXT REFERENCES official_match_selections (id) ON DELETE CASCADE,
  proposal_id TEXT,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'proposed',
      'confirmed',
      'approved',
      'integrity_review_required',
      'rejected',
      'alternative_proposed',
      'dispute_opened',
      'review_started',
      'dispute_resolved_approved',
      'returned_to_selection',
      'voided',
      'reference_reuse_rejected',
      'legacy_review_required'
    )
  ),
  from_status TEXT,
  to_status TEXT,
  version_before INTEGER NOT NULL,
  version_after INTEGER NOT NULL,
  actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  team_id TEXT,
  capacity TEXT NOT NULL CHECK (capacity IN ('team', 'operator', 'system')),
  reason TEXT,
  command_key TEXT,
  request_fingerprint TEXT,
  official_result_id TEXT,
  details JSONB,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS official_selection_actions_encounter_index
  ON official_selection_actions (encounter_id, seq);

-- A command retried with the same key cannot append its action twice.
CREATE UNIQUE INDEX IF NOT EXISTS official_selection_actions_command_key_index
  ON official_selection_actions (encounter_id, actor_id, command_key, action_type)
  WHERE command_key IS NOT NULL;

-- UPDATE is always rejected. DELETE is rejected unless it runs as the cascade of a
-- tenant, competition or selection delete (nested trigger depth), so removing a tenant
-- still works while nobody can edit or drop individual history rows.
CREATE OR REPLACE FUNCTION official_selection_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS official_selection_actions_append_only ON official_selection_actions;
CREATE TRIGGER official_selection_actions_append_only
  BEFORE UPDATE OR DELETE ON official_selection_actions
  FOR EACH ROW EXECUTE FUNCTION official_selection_append_only();

DROP TRIGGER IF EXISTS official_selection_proposals_append_only ON official_selection_proposals;
CREATE TRIGGER official_selection_proposals_append_only
  BEFORE UPDATE OR DELETE ON official_selection_proposals
  FOR EACH ROW EXECUTE FUNCTION official_selection_append_only();

-- 4. Disputes -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS match_disputes (
  id TEXT PRIMARY KEY,
  selection_id TEXT NOT NULL REFERENCES official_match_selections (id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'under_review', 'resolved')),
  opened_by_actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  opened_by_team_id TEXT NOT NULL,
  opened_reason TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  review_started_by_actor_id TEXT REFERENCES actors (id) ON DELETE RESTRICT,
  review_started_at TIMESTAMPTZ,
  resolved_by_actor_id TEXT REFERENCES actors (id) ON DELETE RESTRICT,
  resolved_at TIMESTAMPTZ,
  resolution TEXT CHECK (resolution IN ('approved_proposal', 'returned_to_selection')),
  resolution_proposal_id TEXT,
  resolution_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS match_disputes_active_selection_index
  ON match_disputes (selection_id)
  WHERE status <> 'resolved';

CREATE INDEX IF NOT EXISTS match_disputes_selection_index
  ON match_disputes (selection_id, opened_at);

-- 5. Provider-match reference claims --------------------------------------------------
-- A provider match belongs to at most one selection at a time, across every
-- Encounter and organization (product decision). Released claims stay on record.

CREATE TABLE IF NOT EXISTS official_selection_reference_claims (
  id TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL,
  external_match_id TEXT NOT NULL,
  selection_id TEXT NOT NULL REFERENCES official_match_selections (id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL,
  claimed_by_proposal_id TEXT,
  claimed_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  release_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS official_selection_reference_claims_live_index
  ON official_selection_reference_claims (provider_key, external_match_id)
  WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS official_selection_reference_claims_selection_index
  ON official_selection_reference_claims (selection_id);

-- 6. Official results remember the negotiation that produced them --------------------

ALTER TABLE official_results
  ADD COLUMN IF NOT EXISTS selection_id TEXT,
  ADD COLUMN IF NOT EXISTS proposal_id TEXT,
  ADD COLUMN IF NOT EXISTS approval_basis TEXT
    CHECK (approval_basis IN ('team_agreement', 'operator_resolution'));

-- 7. Legacy backfill (only rows that still carry legacy `slots`) ----------------------

-- One proposal per live legacy selection; the proposing Team was never recorded.
INSERT INTO official_selection_proposals (
  id, selection_id, organization_id, competition_id, encounter_id, round, sequence,
  proposing_team_id, proposed_by_actor_id, slots, supersedes_proposal_id, reason, created_at
)
SELECT 'legacy:' || selection.id, selection.id, selection.organization_id,
       selection.competition_id, selection.encounter_id, 1, 1,
       NULL, selection.proposed_by_actor_id, selection.slots, NULL, NULL, selection.created_at
FROM official_match_selections selection
WHERE selection.superseded_at IS NULL
  AND selection.slots IS NOT NULL
  AND selection.proposed_by_actor_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

UPDATE official_match_selections
SET current_proposal_id = 'legacy:' || id
WHERE superseded_at IS NULL
  AND slots IS NOT NULL
  AND proposed_by_actor_id IS NOT NULL
  AND current_proposal_id IS NULL;

-- The Team of the proposer is unknown, so the rival cannot be determined: an
-- organizer has to decide these.
WITH reviewed AS (
  UPDATE official_match_selections
  SET status = 'organizer_review'
  WHERE superseded_at IS NULL
    AND slots IS NOT NULL
    AND proposed_by_actor_id IS NOT NULL
    AND status = 'awaiting_opponent_confirmation'
  RETURNING id, organization_id, competition_id, encounter_id, proposed_by_actor_id,
            current_proposal_id
)
INSERT INTO official_selection_actions (
  id, selection_id, proposal_id, organization_id, competition_id, encounter_id,
  action_type, from_status, to_status, version_before, version_after, actor_id, team_id,
  capacity, reason, occurred_at
)
SELECT 'legacy:review:' || id, id, current_proposal_id, organization_id, competition_id,
       encounter_id, 'legacy_review_required', 'awaiting_opponent_confirmation',
       'organizer_review', 1, 1, proposed_by_actor_id, NULL, 'system',
       'Migrated from a proposal made before Team attribution existed; the opposing Team is unknown, so an organizer must review it.',
       NOW()
FROM reviewed
ON CONFLICT (id) DO NOTHING;

-- Live legacy selections that are not voided keep owning their provider matches.
-- Legacy data may repeat a reference: the earliest selection wins, the rest get no claim.
INSERT INTO official_selection_reference_claims (
  id, provider_key, external_match_id, selection_id, organization_id, competition_id,
  encounter_id, claimed_by_proposal_id, claimed_at
)
SELECT DISTINCT ON (provider_key, external_match_id)
       'legacy:' || selection_id || ':' || provider_key || ':' || external_match_id,
       provider_key, external_match_id, selection_id, organization_id, competition_id,
       encounter_id, current_proposal_id, claimed_at
FROM (
  SELECT selection.id AS selection_id,
         selection.organization_id,
         selection.competition_id,
         selection.encounter_id,
         selection.current_proposal_id,
         selection.created_at AS claimed_at,
         slot -> 'providerMatchRef' ->> 'providerKey' AS provider_key,
         slot -> 'providerMatchRef' ->> 'externalId' AS external_match_id
  FROM official_match_selections selection
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(selection.slots) = 'array' THEN selection.slots ELSE '[]'::jsonb END
  ) AS slot
  WHERE selection.superseded_at IS NULL
    AND selection.slots IS NOT NULL
    AND selection.status <> 'voided'
    AND NOT EXISTS (
      SELECT 1 FROM official_selection_reference_claims existing
      WHERE existing.selection_id = selection.id
    )
) legacy_refs
WHERE provider_key IS NOT NULL AND external_match_id IS NOT NULL
ORDER BY provider_key, external_match_id, claimed_at, selection_id
ON CONFLICT DO NOTHING;
