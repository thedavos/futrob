WITH ranked_captains AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY organization_id, competition_id, team_id
           ORDER BY created_at ASC, id ASC
         ) AS position
  FROM competition_roster_memberships
  WHERE role = 'captain'
)
UPDATE competition_roster_memberships
SET role = 'player'
WHERE id IN (SELECT id FROM ranked_captains WHERE position > 1);

CREATE UNIQUE INDEX IF NOT EXISTS competition_roster_memberships_one_captain
  ON competition_roster_memberships (organization_id, competition_id, team_id)
  WHERE role = 'captain';
