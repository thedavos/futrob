export const ORGANIZATION_AUDIT_SQL = `
  SELECT '01:organization:' || id AS id, id AS organization_id,
    NULL::text AS competition_id, created_by_actor_id AS actor_id,
    'organizations.created'::text AS action, NULL::text AS reason,
    created_at AS occurred_at, NULL::text AS request_id,
    'organization'::text AS object_type, id AS object_id, name AS object_label,
    NULL::text AS object_href
  FROM organizations
  UNION ALL
  SELECT '60:operation:' || id, organization_id, competition_id, actor_id, action,
    reason, occurred_at, request_id, object_type, object_id, object_label, NULL::text
  FROM organization_operation_audit
`;
