import {
  currentScheduleChangeProposal,
  type DueScheduleChangeRequest,
  type ScheduleChangeExpiryFeedPort,
} from "@futrob/scheduling";
import { asEncounterId, asOrganizationId, compareTime } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import type { InMemoryScheduleChangeRequestRepository } from "./schedule-change-request.repository.ts";

export class PostgresScheduleChangeExpiryFeed implements ScheduleChangeExpiryFeedPort {
  constructor(private readonly pool: Pool) {}
  async listDue(input: {
    readonly dueAt: Date;
    readonly limit: number;
  }): Promise<readonly DueScheduleChangeRequest[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT request.id AS request_id, request.organization_id, request.encounter_id
      FROM schedule_change_requests AS request
      JOIN LATERAL (SELECT response_deadline FROM schedule_change_proposals WHERE request_id = request.id AND organization_id = request.organization_id ORDER BY proposal_order DESC LIMIT 1) AS proposal ON true
      WHERE request.status = 'open' AND proposal.response_deadline <= $1
      ORDER BY proposal.response_deadline, request.id LIMIT $2`,
      [input.dueAt.toISOString(), input.limit],
    );
    const rowSchema = z.object({
      request_id: z.string(),
      organization_id: z.string(),
      encounter_id: z.string(),
    });
    return result.rows.map((value) => {
      const row = rowSchema.parse(value);
      return {
        requestId: row.request_id,
        organizationId: asOrganizationId(row.organization_id),
        encounterId: asEncounterId(row.encounter_id),
      };
    });
  }
}

export class InMemoryScheduleChangeExpiryFeed implements ScheduleChangeExpiryFeedPort {
  constructor(private readonly requests: InMemoryScheduleChangeRequestRepository) {}
  async listDue(input: {
    readonly dueAt: Date;
    readonly limit: number;
  }): Promise<readonly DueScheduleChangeRequest[]> {
    return [...this.requests.rows.values()]
      .filter(
        (request) =>
          request.status === "open" &&
          currentScheduleChangeProposal(request).responseDeadline.getTime() <=
            input.dueAt.getTime(),
      )
      .sort(
        (left, right) =>
          compareTime(
            currentScheduleChangeProposal(left).responseDeadline,
            currentScheduleChangeProposal(right).responseDeadline,
          ) || left.id.localeCompare(right.id),
      )
      .slice(0, input.limit)
      .map((request) => ({
        requestId: request.id,
        organizationId: request.organizationId,
        encounterId: request.encounterId,
      }));
  }
}
