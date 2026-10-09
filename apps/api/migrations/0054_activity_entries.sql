-- Web activity channel (ADR-0008): one row per fact and audience, written by the
-- notifications repository inside the transaction of the command that produced it.
-- Audit stays in each context's own tables; this projection only summarizes the fact.

CREATE TABLE IF NOT EXISTS activity_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  competition_id TEXT REFERENCES competitions (id) ON DELETE CASCADE,
  audience TEXT NOT NULL CHECK (audience IN ('organization', 'team', 'actor')),
  audience_id TEXT NOT NULL CHECK (audience_id <> ''),
  kind TEXT NOT NULL CHECK (
    kind IN ('match_dispute', 'selection_confirmation', 'roster_invitation', 'competition_published')
  ),
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  requires_action BOOLEAN NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('encounter', 'roster_invitation', 'competition')),
  resource_id TEXT NOT NULL,
  subject JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id TEXT NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
  closed_by_actor_id TEXT REFERENCES actors (id) ON DELETE RESTRICT,
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ NOT NULL,
  source_name TEXT NOT NULL CHECK (
    source_name IN ('match_dispute', 'proposal', 'roster_invitation', 'competition')
  ),
  source_id TEXT NOT NULL,
  CHECK ((status = 'open') = (closed_at IS NULL)),
  CHECK (last_event_at = COALESCE(closed_at, opened_at)),
  CHECK (audience <> 'organization' OR audience_id = organization_id),
  UNIQUE (source_name, source_id, audience, audience_id)
);

CREATE INDEX IF NOT EXISTS activity_entries_feed_index
  ON activity_entries (audience, audience_id, last_event_at DESC, id COLLATE "C" DESC);

CREATE INDEX IF NOT EXISTS activity_entries_pending_index
  ON activity_entries (audience, audience_id, opened_at DESC)
  WHERE status = 'open' AND requires_action;

COMMENT ON TABLE activity_entries IS
  'Activity feed and pending work per audience. Only the notifications repository writes it.';

-- Backfill: facts that are still open when this migration runs ---------------------------
-- Times are truncated to milliseconds, the precision of the keyset cursor.

-- Open or under-review disputes: actionable for the organization.
INSERT INTO activity_entries (
  id, organization_id, competition_id, audience, audience_id, kind, status, requires_action,
  resource_type, resource_id, subject, actor_id, opened_at, last_event_at, source_name, source_id
)
SELECT 'backfill:dispute:' || dispute.id, dispute.organization_id, dispute.competition_id,
       'organization', dispute.organization_id, 'match_dispute', 'open', TRUE,
       'encounter', dispute.encounter_id,
       jsonb_build_object(
         'competitionName', competition.name,
         'encounterLabel', CASE WHEN home.name IS NOT NULL AND away.name IS NOT NULL
                                THEN home.name || ' vs ' || away.name END
       ),
       dispute.opened_by_actor_id, date_trunc('milliseconds', dispute.opened_at),
       date_trunc('milliseconds', dispute.opened_at),
       'match_dispute', dispute.id
FROM match_disputes dispute
JOIN competitions competition ON competition.id = dispute.competition_id
LEFT JOIN encounter_schedule_snapshots snapshot ON snapshot.encounter_id = dispute.encounter_id
LEFT JOIN teams home ON home.id = snapshot.home_team_id
LEFT JOIN teams away ON away.id = snapshot.away_team_id
WHERE dispute.status <> 'resolved'
ON CONFLICT DO NOTHING;

-- Proposals awaiting the rival's confirmation: actionable for the rival Team, watched by
-- the organization. Legacy proposals without a proposing Team have no rival and are skipped.
WITH pending AS (
  SELECT proposal.id AS proposal_id, selection.organization_id, selection.competition_id,
         selection.encounter_id, proposal.proposed_by_actor_id, proposal.created_at,
         window_row.confirmation_deadline,
         CASE WHEN proposal.proposing_team_id = snapshot.home_team_id
              THEN snapshot.away_team_id ELSE snapshot.home_team_id END AS rival_team_id,
         competition.name AS competition_name,
         home.name || ' vs ' || away.name AS encounter_label
  FROM official_match_selections selection
  JOIN official_selection_proposals proposal ON proposal.id = selection.current_proposal_id
  JOIN encounter_schedule_snapshots snapshot ON snapshot.encounter_id = selection.encounter_id
  JOIN competitions competition ON competition.id = selection.competition_id
  JOIN teams home ON home.id = snapshot.home_team_id
  JOIN teams away ON away.id = snapshot.away_team_id
  LEFT JOIN official_selection_confirmation_windows window_row
    ON window_row.proposal_id = proposal.id
  WHERE selection.superseded_at IS NULL
    AND selection.status = 'awaiting_opponent_confirmation'
    AND proposal.proposing_team_id IN (snapshot.home_team_id, snapshot.away_team_id)
)
INSERT INTO activity_entries (
  id, organization_id, competition_id, audience, audience_id, kind, status, requires_action,
  resource_type, resource_id, subject, actor_id, opened_at, expires_at, last_event_at,
  source_name, source_id
)
SELECT 'backfill:proposal:' || pending.proposal_id || ':' || recipient.audience,
       pending.organization_id, pending.competition_id, recipient.audience, recipient.audience_id,
       'selection_confirmation', 'open', recipient.requires_action,
       'encounter', pending.encounter_id,
       jsonb_build_object(
         'competitionName', pending.competition_name,
         'encounterLabel', pending.encounter_label,
         'teamName', rival.name
       ),
       pending.proposed_by_actor_id, date_trunc('milliseconds', pending.created_at),
       pending.confirmation_deadline, date_trunc('milliseconds', pending.created_at), 'proposal', pending.proposal_id
FROM pending
JOIN teams rival ON rival.id = pending.rival_team_id
CROSS JOIN LATERAL (
  VALUES ('team', pending.rival_team_id, TRUE),
         ('organization', pending.organization_id, FALSE)
) AS recipient (audience, audience_id, requires_action)
ON CONFLICT DO NOTHING;

-- Pending directed roster invitations: actionable for the invitee, watched by the organization.
INSERT INTO activity_entries (
  id, organization_id, competition_id, audience, audience_id, kind, status, requires_action,
  resource_type, resource_id, subject, actor_id, opened_at, expires_at, last_event_at,
  source_name, source_id
)
SELECT 'backfill:invitation:' || invitation.id || ':' || recipient.audience,
       invitation.organization_id, invitation.competition_id, recipient.audience,
       recipient.audience_id, 'roster_invitation', 'open', recipient.requires_action,
       'roster_invitation', invitation.id,
       jsonb_build_object('competitionName', competition.name, 'teamName', team.name),
       invitation.invited_by_actor_id, date_trunc('milliseconds', invitation.created_at),
       invitation.expires_at, date_trunc('milliseconds', invitation.created_at), 'roster_invitation', invitation.id
FROM roster_invitations invitation
JOIN competitions competition ON competition.id = invitation.competition_id
JOIN teams team ON team.id = invitation.team_id
CROSS JOIN LATERAL (
  VALUES ('actor', invitation.invitee_actor_id, TRUE),
         ('organization', invitation.organization_id, FALSE)
) AS recipient (audience, audience_id, requires_action)
WHERE invitation.status = 'pending'
  AND invitation.invitee_actor_id IS NOT NULL
ON CONFLICT DO NOTHING;
