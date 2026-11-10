export const RESULTS_AUDIT_SQL = `
  SELECT '70:result:' || lpad(seq::text, 20, '0') || ':' || id AS id,
    organization_id, competition_id, actor_id, 'results.' || action_type AS action,
    reason, occurred_at, command_key AS request_id, 'encounter'::text AS object_type,
    encounter_id AS object_id, NULL::text AS object_label, NULL::text AS object_href
  FROM official_selection_actions
`;
