export const SCHEDULING_AUDIT_SQL = `
  SELECT '61:fixture-edit:' || lpad(id::text, 20, '0') AS id, organization_id,
    competition_id, actor_id, 'scheduling.encounter_edited'::text AS action,
    reason, occurred_at, request_id, 'encounter'::text AS object_type,
    encounter_id AS object_id, NULL::text AS object_label, NULL::text AS object_href
  FROM fixture_encounter_audit
  UNION ALL
  SELECT '62:swiss:' || id, organization_id, competition_id, actor_id,
    CASE WHEN kind = 'withdraw' THEN 'scheduling.team_withdrawn' ELSE 'scheduling.round_closed' END,
    reason, occurred_at, request_id,
    CASE WHEN kind = 'withdraw' THEN 'team' ELSE 'fixture' END,
    CASE WHEN kind = 'withdraw' THEN team_id ELSE fixture_plan_id END,
    NULL::text, NULL::text FROM swiss_round_actions
`;
