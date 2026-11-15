export const COMPETITION_AUDIT_SQL = `
  SELECT '02:competition:' || id AS id, organization_id, id AS competition_id,
    created_by_actor_id AS actor_id, 'competitions.created'::text AS action,
    NULL::text AS reason, created_at AS occurred_at, NULL::text AS request_id,
    'competition'::text AS object_type, id AS object_id, name AS object_label,
    NULL::text AS object_href FROM competitions
  UNION ALL
  SELECT '91:sanction:' || id, organization_id, competition_id, imposed_by_actor_id,
    'sanctions.imposed', reason, imposed_at, request_id, 'sanction', id, NULL::text, NULL::text
  FROM competition_sanctions
  UNION ALL
  SELECT '92:sanction:' || id, organization_id, competition_id, revoked_by_actor_id,
    'sanctions.revoked', revocation_reason, revoked_at, revocation_request_id,
    'sanction', id, NULL::text, NULL::text FROM competition_sanctions WHERE revoked_at IS NOT NULL
`;
