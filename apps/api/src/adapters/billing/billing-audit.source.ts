export const BILLING_AUDIT_SQL = `
  SELECT '93:billing:' || id AS id, organization_id, NULL::text AS competition_id,
    changed_by_actor_id AS actor_id, 'billing.plan_changed'::text AS action,
    reason, occurred_at, NULL::text AS request_id, 'billing'::text AS object_type,
    organization_id AS object_id, after_json->>'planKey' AS object_label,
    NULL::text AS object_href FROM billing_plan_changes WHERE subject_type = 'organization'
`;
