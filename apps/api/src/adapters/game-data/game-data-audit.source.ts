export const GAME_DATA_AUDIT_SQL = `
  SELECT '07:sync-queued:' || id AS id, organization_id,
    NULL::text AS competition_id, NULL::text AS actor_id,
    'game_data.sync_queued'::text AS action, NULL::text AS reason,
    created_at AS occurred_at, request_id,
    'sync_job'::text AS object_type, id AS object_id,
    NULL::text AS object_label, NULL::text AS object_href
  FROM provider_sync_jobs
  UNION ALL
  SELECT '08:sync-completed:' || id, organization_id, NULL::text, NULL::text,
    'game_data.sync_completed', NULL::text, completed_at, request_id,
    'sync_job', id, NULL::text, NULL::text
  FROM provider_sync_jobs WHERE status = 'succeeded'
`;
