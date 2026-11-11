export const NOTIFICATION_AUDIT_SQL = `
  SELECT '06:publication:' || id AS id, organization_id, competition_id, actor_id,
    'competitions.published'::text AS action, NULL::text AS reason,
    opened_at AS occurred_at, NULL::text AS request_id,
    'competition'::text AS object_type, resource_id AS object_id,
    subject->>'competitionName' AS object_label, NULL::text AS object_href
  FROM activity_entries WHERE kind = 'competition_published' AND audience = 'organization'
  UNION ALL
  SELECT '04:entry:' || source_id, organization_id, competition_id, actor_id,
    'competitions.entry_registered', NULL::text, opened_at, NULL::text,
    'competition', resource_id, subject->>'teamName', NULL::text
  FROM activity_entries WHERE kind = 'competition_entry' AND audience = 'organization'
  UNION ALL
  SELECT '05:entry-decision:' || source_id, organization_id, competition_id, actor_id,
    'competitions.' || (subject->>'outcome'), NULL::text, opened_at, NULL::text,
    'competition', resource_id, subject->>'teamName', NULL::text
  FROM activity_entries WHERE kind = 'organizer_decision' AND audience = 'organization'
    AND subject->>'outcome' IN ('entry_approved', 'entry_rejected')
`;
