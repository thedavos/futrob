export const AUTHORIZATION_AUDIT_SQL = `
  SELECT '90:authorization:' || id AS id, organization_id,
    CASE WHEN scope_type = 'competition' THEN scope_id ELSE NULL END AS competition_id,
    actor_id, action, reason, created_at AS occurred_at,
    NULL::text AS request_id, 'actor'::text AS object_type,
    target_actor_id AS object_id, NULL::text AS object_label, NULL::text AS object_href
  FROM authorization_audit_log WHERE organization_id IS NOT NULL
`;
