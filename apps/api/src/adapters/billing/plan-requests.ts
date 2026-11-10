import {
  isOrganizationPlanKey,
  type PlanRequest,
  type PlanRequestRepository,
} from "@futrob/billing";
import {
  asActorId,
  asOrganizationId,
  compareTime,
  Panic,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const planRequestRowSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  plan_key: z.string(),
  requested_by_actor_id: z.string(),
  status: z.enum(["pending", "fulfilled", "canceled"]),
  created_at: pgTimestampSchema,
  resolved_at: pgTimestampSchema.nullable(),
});

type PlanRequestRow = z.infer<typeof planRequestRowSchema>;

function fromRow(row: PlanRequestRow): PlanRequest {
  if (!isOrganizationPlanKey(row.plan_key)) {
    throw new Panic(`billing_plan_requests references unknown plan ${row.plan_key}`);
  }
  return {
    id: row.id,
    organizationId: asOrganizationId(row.organization_id),
    planKey: row.plan_key,
    requestedByActorId: asActorId(row.requested_by_actor_id),
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export class PostgresPlanRequestRepository implements PlanRequestRepository {
  constructor(private readonly pool: Pool) {}

  async findPendingForOrganization(organizationId: OrganizationId) {
    const result = await getPgExecutor(this.pool).query(
      "SELECT * FROM billing_plan_requests WHERE organization_id = $1 AND status = 'pending'",
      [organizationId],
    );
    return result.rows[0] ? fromRow(planRequestRowSchema.parse(result.rows[0])) : null;
  }

  async listPending(limit: number) {
    const result = await getPgExecutor(this.pool).query(
      `SELECT * FROM billing_plan_requests
       WHERE status = 'pending'
       ORDER BY created_at ASC, id ASC
       LIMIT $1`,
      [limit],
    );
    return result.rows.map((row) => fromRow(planRequestRowSchema.parse(row)));
  }

  async save(request: PlanRequest): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO billing_plan_requests (
         id, organization_id, plan_key, requested_by_actor_id, status, created_at, resolved_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, resolved_at = EXCLUDED.resolved_at`,
      [
        request.id,
        request.organizationId,
        request.planKey,
        request.requestedByActorId,
        request.status,
        request.createdAt.toISOString(),
        request.resolvedAt?.toISOString() ?? null,
      ],
    );
  }
}

export class InMemoryPlanRequestRepository implements PlanRequestRepository {
  private readonly requests = new Map<string, PlanRequest>();

  async findPendingForOrganization(organizationId: OrganizationId) {
    return (
      [...this.requests.values()].find(
        (request) => request.organizationId === organizationId && request.status === "pending",
      ) ?? null
    );
  }

  async listPending(limit: number) {
    return [...this.requests.values()]
      .filter((request) => request.status === "pending")
      .sort((a, b) => compareTime(a.createdAt, b.createdAt) || a.id.localeCompare(b.id))
      .slice(0, limit);
  }

  async save(request: PlanRequest): Promise<void> {
    this.requests.set(request.id, request);
  }
}
