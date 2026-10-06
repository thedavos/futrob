import type {
  AppliedScheduleChange,
  ScheduleChangeApplicationFeedPort,
  ScheduleChangeRequest,
} from "@futrob/scheduling";
import { asEncounterId, asOrganizationId, compareTime } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const appliedScheduleChangeRowSchema = z.object({
  id: pgTextSchema,
  request_id: pgTextSchema,
  organization_id: pgTextSchema,
  encounter_id: pgTextSchema,
  applied_at: pgTimestampSchema,
});

type ListInput = Parameters<ScheduleChangeApplicationFeedPort["listUnacknowledged"]>[0];
type AcknowledgeInput = Parameters<ScheduleChangeApplicationFeedPort["acknowledge"]>[0];

export class InMemoryScheduleChangeApplicationFeed implements ScheduleChangeApplicationFeedPort {
  readonly acknowledgements = new Map<string, Date>();

  constructor(
    private readonly requests: { readonly rows: ReadonlyMap<string, ScheduleChangeRequest> },
  ) {}

  async listUnacknowledged(input: ListInput): Promise<readonly AppliedScheduleChange[]> {
    return [...this.requests.rows.values()]
      .flatMap((request): AppliedScheduleChange[] =>
        request.application &&
        !this.acknowledgements.has(acknowledgementKey(input.consumer, request.application.id))
          ? [
              {
                applicationId: request.application.id,
                requestId: request.id,
                organizationId: request.organizationId,
                encounterId: request.encounterId,
                appliedAt: request.application.appliedAt,
              },
            ]
          : [],
      )
      .sort((left, right) => {
        const time = compareTime(left.appliedAt, right.appliedAt);
        if (time !== 0) return time;
        return left.applicationId < right.applicationId ? -1 : 1;
      })
      .slice(0, input.limit);
  }

  async acknowledge(input: AcknowledgeInput): Promise<void> {
    const key = acknowledgementKey(input.consumer, input.applicationId);
    if (!this.acknowledgements.has(key)) this.acknowledgements.set(key, input.acknowledgedAt);
  }
}

export class PostgresScheduleChangeApplicationFeed implements ScheduleChangeApplicationFeedPort {
  constructor(private readonly pool: Pool) {}

  async listUnacknowledged(input: ListInput): Promise<readonly AppliedScheduleChange[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT application.id, application.request_id, application.organization_id,
              request.encounter_id, application.applied_at
       FROM schedule_change_applications AS application
       JOIN schedule_change_requests AS request
         ON request.id = application.request_id
        AND request.organization_id = application.organization_id
       WHERE NOT EXISTS (
         SELECT 1 FROM schedule_change_application_acknowledgements AS acknowledgement
         WHERE acknowledgement.consumer = $1
           AND acknowledgement.application_id = application.id
       )
       ORDER BY application.applied_at ASC, application.id ASC
       LIMIT $2`,
      [input.consumer, input.limit],
    );
    return result.rows.map((row) => {
      const parsed = appliedScheduleChangeRowSchema.parse(row);
      return {
        applicationId: parsed.id,
        requestId: parsed.request_id,
        organizationId: asOrganizationId(parsed.organization_id),
        encounterId: asEncounterId(parsed.encounter_id),
        appliedAt: parsed.applied_at,
      };
    });
  }

  async acknowledge(input: AcknowledgeInput): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO schedule_change_application_acknowledgements (
         consumer, application_id, acknowledged_at
       ) VALUES ($1, $2, $3)
       ON CONFLICT (consumer, application_id) DO NOTHING`,
      [input.consumer, input.applicationId, input.acknowledgedAt.toISOString()],
    );
  }
}

function acknowledgementKey(consumer: string, applicationId: string): string {
  return `${consumer}\u0000${applicationId}`;
}
