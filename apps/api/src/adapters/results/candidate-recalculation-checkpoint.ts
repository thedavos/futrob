import type { Pool } from "pg";
import { z } from "zod";
import { pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import type {
  CandidateRecalculationCheckpoint,
  CandidateRecalculationCheckpointPort,
} from "@/application/results/recalculate-rescheduled-candidates.ts";

export class InMemoryCandidateRecalculationCheckpoints implements CandidateRecalculationCheckpointPort {
  readonly rows = new Map<string, CandidateRecalculationCheckpoint>();

  async latestAppliedAt(): Promise<Date | null> {
    const times = [...this.rows.values()].map((row) => row.application.appliedAt.getTime());
    return times.length === 0 ? null : new Date(Math.max(...times));
  }

  async listRecorded(applicationIds: readonly string[]): Promise<ReadonlySet<string>> {
    return new Set(applicationIds.filter((id) => this.rows.has(id)));
  }

  async record(checkpoint: CandidateRecalculationCheckpoint): Promise<void> {
    if (!this.rows.has(checkpoint.application.applicationId)) {
      this.rows.set(checkpoint.application.applicationId, checkpoint);
    }
  }
}

export class PostgresCandidateRecalculationCheckpoints implements CandidateRecalculationCheckpointPort {
  constructor(private readonly pool: Pool) {}

  async latestAppliedAt(): Promise<Date | null> {
    const result = await getPgExecutor(this.pool).query(
      "SELECT MAX(applied_at) AS applied_at FROM encounter_candidate_recalculations",
    );
    return z.object({ applied_at: pgTimestampSchema.nullable() }).parse(result.rows[0]).applied_at;
  }

  async listRecorded(applicationIds: readonly string[]): Promise<ReadonlySet<string>> {
    if (applicationIds.length === 0) return new Set();
    const result = await getPgExecutor(this.pool).query<{ application_id: string }>(
      `SELECT application_id FROM encounter_candidate_recalculations
       WHERE application_id = ANY($1::text[])`,
      [applicationIds],
    );
    return new Set(result.rows.map((row) => row.application_id));
  }

  async record(checkpoint: CandidateRecalculationCheckpoint): Promise<void> {
    const { application } = checkpoint;
    await getPgExecutor(this.pool).query(
      `INSERT INTO encounter_candidate_recalculations (
         application_id, organization_id, encounter_id, applied_at, outcome, recalculated_at
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (application_id) DO NOTHING`,
      [
        application.applicationId,
        application.organizationId,
        application.encounterId,
        application.appliedAt.toISOString(),
        checkpoint.outcome,
        checkpoint.recalculatedAt.toISOString(),
      ],
    );
  }
}
