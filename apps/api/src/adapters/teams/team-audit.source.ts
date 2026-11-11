export const TEAM_AUDIT_SQL = `
  SELECT '03:team:' || id AS id, organization_id, NULL::text AS competition_id,
    created_by_actor_id AS actor_id, 'teams.created'::text AS action,
    NULL::text AS reason, created_at AS occurred_at, NULL::text AS request_id,
    'team'::text AS object_type, id AS object_id, name AS object_label,
    NULL::text AS object_href FROM teams
`;
