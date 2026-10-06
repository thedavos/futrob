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

type FeedInput = Parameters<ScheduleChangeApplicationFeedPort["listAppliedAfter"]>[0];

export class InMemoryScheduleChangeApplicationFeed implements ScheduleChangeApplicationFeedPort {
  constructor(
    private readonly requests: { readonly rows: ReadonlyMap<string, ScheduleChangeRequest> },
  ) {}

  async listAppliedAfter(input: FeedInput): Promise<readonly AppliedScheduleChange[]> {
    const after = input.after;
    return [...this.requests.rows.values()]
      .flatMap((request): AppliedScheduleChange[] =>
        request.application
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
      .sort(compareFeedOrder)
      .filter((applied) => !after || compareFeedOrder(applied, after) > 0)
      .slice(0, input.limit);
  }
}

export class PostgresScheduleChangeApplicationFeed implements ScheduleChangeApplicationFeedPort {
  constructor(private readonly pool: Pool) {}

  async listAppliedAfter(input: FeedInput): Promise<readonly AppliedScheduleChange[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT application.id, application.request_id, application.organization_id,
              request.encounter_id, application.applied_at
       FROM schedule_change_applications AS application
       JOIN schedule_change_requests AS request
         ON request.id = application.request_id
        AND request.organization_id = application.organization_id
       WHERE $1::timestamptz IS NULL
          OR (application.applied_at, application.id) > ($1::timestamptz, $2::text)
       ORDER BY application.applied_at ASC, application.id ASC
       LIMIT $3`,
      [input.after?.appliedAt.toISOString() ?? null, input.after?.applicationId ?? "", input.limit],
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
}

function compareFeedOrder(
  left: Pick<AppliedScheduleChange, "appliedAt" | "applicationId">,
  right: Pick<AppliedScheduleChange, "appliedAt" | "applicationId">,
): number {
  const time = compareTime(left.appliedAt, right.appliedAt);
  if (time !== 0) return time;
  return left.applicationId < right.applicationId
    ? -1
    : left.applicationId > right.applicationId
      ? 1
      : 0;
}
