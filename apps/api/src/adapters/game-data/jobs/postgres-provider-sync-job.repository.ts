import type {
  ProviderSyncJob,
  ProviderSyncJobRepository,
  QueuedProviderSyncJob,
  RunningProviderSyncJob,
} from "@futrob/game-data";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class PostgresProviderSyncJobRepository implements ProviderSyncJobRepository {
  constructor(private readonly pool: Pool) {}

  async enqueue(job: QueuedProviderSyncJob): Promise<ProviderSyncJob> {
    const executor = getPgExecutor(this.pool);
    const inserted = await executor.query(
      `INSERT INTO provider_sync_jobs (
         id, organization_id, provider_key, kind, input_json, dedupe_key, request_id,
         status, attempt, max_attempts, available_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (organization_id, dedupe_key)
         WHERE status IN ('queued', 'running', 'retry_scheduled')
       DO NOTHING
       RETURNING *`,
      [
        job.id,
        job.organizationId,
        job.providerKey,
        job.kind,
        JSON.stringify(job.sync),
        job.dedupeKey,
        job.requestId,
        job.status,
        job.attempt,
        job.maxAttempts,
        job.availableAt.toISOString(),
        job.createdAt.toISOString(),
        job.updatedAt.toISOString(),
      ],
    );
    if (inserted.rows[0]) return rehydrateJob(inserted.rows[0]);
    const existing = await executor.query(
      `SELECT * FROM provider_sync_jobs
       WHERE organization_id = $1 AND dedupe_key = $2
         AND status IN ('queued', 'running', 'retry_scheduled')`,
      [job.organizationId, job.dedupeKey],
    );
    if (!existing.rows[0]) return this.enqueue(job);
    return rehydrateJob(existing.rows[0]);
  }

  async claimNext(input: Parameters<ProviderSyncJobRepository["claimNext"]>[0]) {
    const result = await getPgExecutor(this.pool).query(
      `WITH claimable AS (
         SELECT id FROM provider_sync_jobs
         WHERE ($4::text IS NULL OR id = $4)
           AND (
             (status IN ('queued', 'retry_scheduled') AND available_at <= $1)
             OR (status = 'running' AND lease_expires_at <= $1)
           )
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE provider_sync_jobs AS job
       SET status = 'running', attempt = job.attempt + 1, lease_token = $2,
           lease_expires_at = $3, started_at = $1, updated_at = $1,
           available_at = NULL
       FROM claimable
       WHERE job.id = claimable.id
       RETURNING job.*`,
      [input.now.toISOString(), input.leaseToken, input.leaseExpiresAt.toISOString(), input.jobId],
    );
    return result.rows[0] ? (rehydrateJob(result.rows[0]) as RunningProviderSyncJob) : null;
  }

  async findById(id: string): Promise<ProviderSyncJob | null> {
    const result = await getPgExecutor(this.pool).query(
      "SELECT * FROM provider_sync_jobs WHERE id = $1",
      [id],
    );
    return result.rows[0] ? rehydrateJob(result.rows[0]) : null;
  }

  succeed(input: Parameters<ProviderSyncJobRepository["succeed"]>[0]) {
    return this.finish(input.id, input.leaseToken, "succeeded", input.completedAt, null);
  }

  async scheduleRetry(input: Parameters<ProviderSyncJobRepository["scheduleRetry"]>[0]) {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE provider_sync_jobs
       SET status = 'retry_scheduled', available_at = $3, last_error_code = $4,
           lease_token = NULL, lease_expires_at = NULL, updated_at = $3
       WHERE id = $1 AND status = 'running' AND lease_token = $2`,
      [input.id, input.leaseToken, input.availableAt.toISOString(), input.lastErrorCode],
    );
    return (result.rowCount ?? 0) === 1;
  }

  moveToDead(input: Parameters<ProviderSyncJobRepository["moveToDead"]>[0]) {
    return this.finish(input.id, input.leaseToken, "dead", input.completedAt, input.lastErrorCode);
  }

  private async finish(
    id: string,
    leaseToken: string,
    status: "succeeded" | "dead",
    completedAt: Date,
    lastErrorCode: string | null,
  ) {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE provider_sync_jobs
       SET status = $3, completed_at = $4, last_error_code = $5,
           lease_token = NULL, lease_expires_at = NULL, updated_at = $4
       WHERE id = $1 AND status = 'running' AND lease_token = $2`,
      [id, leaseToken, status, completedAt.toISOString(), lastErrorCode],
    );
    return (result.rowCount ?? 0) === 1;
  }
}

function rehydrateJob(row: Record<string, unknown>): ProviderSyncJob {
  const base = {
    id: String(row.id),
    organizationId: String(row.organization_id),
    providerKey: String(row.provider_key) as ProviderSyncJob["providerKey"],
    kind: "recent-matches" as const,
    sync: row.input_json as ProviderSyncJob["sync"],
    dedupeKey: String(row.dedupe_key),
    requestId: String(row.request_id),
    attempt: Number(row.attempt),
    maxAttempts: Number(row.max_attempts),
    createdAt: new Date(row.created_at as string | Date),
    updatedAt: new Date(row.updated_at as string | Date),
  };
  switch (row.status) {
    case "queued":
      return {
        ...base,
        status: "queued",
        availableAt: new Date(row.available_at as string | Date),
      };
    case "retry_scheduled":
      return {
        ...base,
        status: "retry_scheduled",
        availableAt: new Date(row.available_at as string | Date),
        lastErrorCode: String(row.last_error_code),
      };
    case "running":
      return {
        ...base,
        status: "running",
        leaseToken: String(row.lease_token),
        leaseExpiresAt: new Date(row.lease_expires_at as string | Date),
        startedAt: new Date(row.started_at as string | Date),
      };
    case "succeeded":
      return {
        ...base,
        status: "succeeded",
        completedAt: new Date(row.completed_at as string | Date),
      };
    case "dead":
      return {
        ...base,
        status: "dead",
        completedAt: new Date(row.completed_at as string | Date),
        lastErrorCode: String(row.last_error_code),
      };
    default:
      throw new TypeError(`Unknown provider sync job status: ${String(row.status)}`);
  }
}
