import {
  ActiveScheduleChangeRequestExists,
  rescheduleScopesConflict,
  ScheduleChangeRequestIdempotencyConflict,
  ScheduleChangeRequestNotFound,
  type RescheduleScope,
  type ScheduleChangeProposal,
  type ScheduleChangeRequest,
  type ScheduleChangeRequestRepository,
} from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
  type TeamId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import {
  getPgExecutor,
  isInPgTransaction,
  type PgExecutor,
} from "@/adapters/persistence/pg-transaction.ts";

export interface CountAcceptedReschedulesInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly encounterId: EncounterId;
  readonly teamId: TeamId;
}

export class InMemoryScheduleChangeRequestRepository implements ScheduleChangeRequestRepository {
  readonly rows = new Map<string, ScheduleChangeRequest>();

  async findByIdempotencyKey(
    organizationId: OrganizationId,
    idempotencyKey: string,
  ): Promise<ScheduleChangeRequest | null> {
    return (
      [...this.rows.values()].find(
        (request) =>
          request.organizationId === organizationId && request.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async listActiveByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly ScheduleChangeRequest[]> {
    return [...this.rows.values()].filter(
      (request) =>
        request.organizationId === organizationId &&
        request.encounterId === encounterId &&
        request.status === "open",
    );
  }

  async countAcceptedByTeam(input: CountAcceptedReschedulesInput): Promise<number> {
    return [...this.rows.values()].filter(
      (request) =>
        request.organizationId === input.organizationId &&
        request.competitionId === input.competitionId &&
        request.encounterId === input.encounterId &&
        request.requestingTeamId === input.teamId &&
        request.status === "accepted",
    ).length;
  }

  async save(request: ScheduleChangeRequest): Promise<ScheduleChangeRequest> {
    const existing = this.rows.get(request.id);
    if (existing && existing.organizationId !== request.organizationId) {
      return request;
    }

    const duplicateKey = [...this.rows.values()].find(
      (row) =>
        row.organizationId === request.organizationId &&
        row.idempotencyKey === request.idempotencyKey &&
        row.id !== request.id,
    );
    if (duplicateKey) {
      throw idempotencyConflict();
    }

    if (request.status === "open") {
      const conflicting = [...this.rows.values()].find(
        (row) =>
          row.id !== request.id &&
          row.organizationId === request.organizationId &&
          row.encounterId === request.encounterId &&
          row.status === "open" &&
          rescheduleScopesConflict(row.scope, request.scope),
      );
      if (conflicting) {
        throw activeScopeConflict(request.encounterId, conflicting.id);
      }
    }

    this.rows.set(request.id, request);
    return request;
  }
}

export class PostgresScheduleChangeRequestRepository implements ScheduleChangeRequestRepository {
  constructor(private readonly pool: Pool) {}

  async findByIdempotencyKey(
    organizationId: OrganizationId,
    idempotencyKey: string,
  ): Promise<ScheduleChangeRequest | null> {
    const result = await getPgExecutor(this.pool).query(
      `${requestSelectSql}
       WHERE request.organization_id = $1 AND request.idempotency_key = $2`,
      [organizationId, idempotencyKey],
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.rehydrateWithProposals(requestRowSchema.parse(row));
  }

  async listActiveByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly ScheduleChangeRequest[]> {
    const result = await getPgExecutor(this.pool).query(
      `${requestSelectSql}
       WHERE request.organization_id = $1
         AND request.encounter_id = $2
         AND request.status = 'open'
       ORDER BY request.created_at ASC, request.id ASC`,
      [organizationId, encounterId],
    );
    const requests = await Promise.all(
      result.rows.map((row) => this.rehydrateWithProposals(requestRowSchema.parse(row))),
    );
    return requests;
  }

  async countAcceptedByTeam(input: CountAcceptedReschedulesInput): Promise<number> {
    const result = await getPgExecutor(this.pool).query<{ count: string | number }>(
      `SELECT COUNT(*)::integer AS count
       FROM schedule_change_requests
       WHERE organization_id = $1
         AND competition_id = $2
         AND encounter_id = $3
         AND requesting_team_id = $4
         AND status = 'accepted'`,
      [input.organizationId, input.competitionId, input.encounterId, input.teamId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async save(request: ScheduleChangeRequest): Promise<ScheduleChangeRequest> {
    if (isInPgTransaction()) {
      try {
        await this.write(getPgExecutor(this.pool), request);
        return request;
      } catch (error) {
        throw mapScheduleChangeRequestWriteError(error, request);
      }
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await this.write(client, request);
      await client.query("COMMIT");
      return request;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Prefer the unique/FK mapping over a secondary rollback error.
      }
      throw mapScheduleChangeRequestWriteError(error, request);
    } finally {
      client.release();
    }
  }

  private async write(executor: PgExecutor, request: ScheduleChangeRequest): Promise<void> {
    const scope = scopeColumns(request.scope);
    const upserted = await executor.query(
      `INSERT INTO schedule_change_requests (
         id, organization_id, competition_id, encounter_id, requesting_team_id,
         initiated_by_actor_id, scope_type, official_slot, status, idempotency_key,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         competition_id = EXCLUDED.competition_id,
         encounter_id = EXCLUDED.encounter_id,
         requesting_team_id = EXCLUDED.requesting_team_id,
         initiated_by_actor_id = EXCLUDED.initiated_by_actor_id,
         scope_type = EXCLUDED.scope_type,
         official_slot = EXCLUDED.official_slot,
         status = EXCLUDED.status,
         idempotency_key = EXCLUDED.idempotency_key,
         updated_at = EXCLUDED.updated_at
       WHERE schedule_change_requests.organization_id = EXCLUDED.organization_id
       RETURNING id`,
      [
        request.id,
        request.organizationId,
        request.competitionId,
        request.encounterId,
        request.requestingTeamId,
        request.initiatedByActorId,
        scope.scopeType,
        scope.officialSlot,
        request.status,
        request.idempotencyKey,
        request.createdAt.toISOString(),
        request.updatedAt.toISOString(),
      ],
    );
    if (!upserted.rows[0]) return;

    await executor.query(
      `DELETE FROM schedule_change_proposals
       WHERE request_id = $1 AND organization_id = $2`,
      [request.id, request.organizationId],
    );

    const values = request.proposals.flatMap((proposal, index) => [
      proposal.id,
      request.id,
      request.organizationId,
      proposal.proposedStartAt.toISOString(),
      proposal.proposedByActorId,
      proposal.proposedByTeamId,
      proposal.reason,
      proposal.createdAt.toISOString(),
      index + 1,
    ]);
    const placeholders = request.proposals
      .map((_, index) => {
        const offset = index * 9;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
      })
      .join(", ");
    await executor.query(
      `INSERT INTO schedule_change_proposals (
         id, request_id, organization_id, proposed_start_at, proposed_by_actor_id,
         proposed_by_team_id, reason, created_at, proposal_order
       ) VALUES ${placeholders}`,
      values,
    );
  }

  private async rehydrateWithProposals(
    row: z.infer<typeof requestRowSchema>,
  ): Promise<ScheduleChangeRequest> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, request_id, organization_id, proposed_start_at, proposed_by_actor_id,
              proposed_by_team_id, reason, created_at, proposal_order
       FROM schedule_change_proposals
       WHERE organization_id = $1 AND request_id = $2
       ORDER BY proposal_order ASC, created_at ASC`,
      [row.organization_id, row.id],
    );
    return rehydrateRequest(
      row,
      result.rows.map((proposal) => proposalRowSchema.parse(proposal)),
    );
  }
}

const requestSelectSql = `SELECT request.id, request.organization_id, request.competition_id,
       request.encounter_id, request.requesting_team_id, request.initiated_by_actor_id,
       request.scope_type, request.official_slot, request.status, request.idempotency_key,
       request.created_at, request.updated_at
FROM schedule_change_requests AS request`;

const requestRowSchema = z.object({
  id: pgTextSchema,
  organization_id: pgTextSchema,
  competition_id: pgTextSchema,
  encounter_id: pgTextSchema,
  requesting_team_id: pgTextSchema,
  initiated_by_actor_id: pgTextSchema,
  scope_type: z.enum(["entire_encounter", "official_match"]),
  official_slot: z.union([z.null(), z.coerce.number().pipe(z.union([z.literal(1), z.literal(2)]))]),
  status: z.enum(["open", "accepted", "rejected", "cancelled", "expired", "escalated"]),
  idempotency_key: pgTextSchema,
  created_at: pgTimestampSchema,
  updated_at: pgTimestampSchema,
});

const proposalRowSchema = z.object({
  id: pgTextSchema,
  request_id: pgTextSchema,
  organization_id: pgTextSchema,
  proposed_start_at: pgTimestampSchema,
  proposed_by_actor_id: pgTextSchema,
  proposed_by_team_id: pgTextSchema,
  reason: pgTextSchema,
  created_at: pgTimestampSchema,
  proposal_order: z.coerce.number().int().positive(),
});

const IDEMPOTENCY_CONSTRAINT = "schedule_change_requests_idempotency_uidx";
const ENCOUNTER_SNAPSHOT_FK = "schedule_change_requests_encounter_snapshot_fkey";
const ACTIVE_SLOT_CONSTRAINTS = new Set([
  "schedule_change_requests_active_slot_1_uidx",
  "schedule_change_requests_active_slot_2_uidx",
]);

function idempotencyConflict(): ScheduleChangeRequestIdempotencyConflict {
  return new ScheduleChangeRequestIdempotencyConflict({
    code: "scheduling.schedule_change_idempotency_conflict",
    message: "The idempotency key was already used with a different request",
  });
}

function activeScopeConflict(
  encounterId: EncounterId,
  activeRequestId: string,
): ActiveScheduleChangeRequestExists {
  return new ActiveScheduleChangeRequestExists({
    code: "scheduling.active_schedule_change_request_exists",
    message: "This schedule scope already has an active change request",
    encounterId,
    activeRequestId,
  });
}

function mapScheduleChangeRequestWriteError(error: unknown, request: ScheduleChangeRequest): never {
  if (
    error instanceof ScheduleChangeRequestIdempotencyConflict ||
    error instanceof ActiveScheduleChangeRequestExists ||
    error instanceof ScheduleChangeRequestNotFound
  ) {
    throw error;
  }

  const pg = pgErrorFields(error);
  const constraintHaystack = `${pg.constraint ?? ""} ${pg.message}`;
  if (pg.code === "23505") {
    if (
      pg.constraint === IDEMPOTENCY_CONSTRAINT ||
      constraintHaystack.includes("schedule_change_requests_idempotency_uidx")
    ) {
      throw idempotencyConflict();
    }
    if (
      (pg.constraint && ACTIVE_SLOT_CONSTRAINTS.has(pg.constraint)) ||
      constraintHaystack.includes("schedule_change_requests_active_slot_")
    ) {
      throw activeScopeConflict(request.encounterId, "unknown");
    }
  }
  if (
    pg.code === "23503" &&
    (pg.constraint === ENCOUNTER_SNAPSHOT_FK ||
      constraintHaystack.includes("schedule_change_requests_encounter_snapshot_fkey"))
  ) {
    throw new ScheduleChangeRequestNotFound({
      code: "scheduling.schedule_change_encounter_not_found",
      message: "Encounter not found",
      encounterId: request.encounterId,
    });
  }
  throw error;
}

function pgErrorFields(error: unknown): { code?: string; constraint?: string; message: string } {
  if (!(error instanceof Error)) return { message: "" };
  return {
    code: "code" in error && typeof error.code === "string" ? error.code : undefined,
    constraint:
      "constraint" in error && typeof error.constraint === "string" ? error.constraint : undefined,
    message: error.message,
  };
}

function scopeColumns(scope: RescheduleScope) {
  switch (scope.type) {
    case "entire_encounter":
      return { scopeType: "entire_encounter" as const, officialSlot: null };
    case "official_match":
      return { scopeType: "official_match" as const, officialSlot: scope.officialSlot };
    default: {
      const exhaustiveScope: never = scope;
      void exhaustiveScope;
      throw new TypeError("Invalid schedule change scope");
    }
  }
}

function rehydrateScope(
  scopeType: "entire_encounter" | "official_match",
  officialSlot: 1 | 2 | null,
): RescheduleScope {
  switch (scopeType) {
    case "entire_encounter":
      return { type: "entire_encounter" };
    case "official_match":
      if (officialSlot !== 1 && officialSlot !== 2) {
        throw new TypeError(`Invalid official match slot: ${officialSlot}`);
      }
      return { type: "official_match", officialSlot };
    default: {
      const exhaustiveScope: never = scopeType;
      void exhaustiveScope;
      throw new TypeError("Invalid schedule change scope");
    }
  }
}

function rehydrateRequest(
  row: z.infer<typeof requestRowSchema>,
  proposalRows: readonly z.infer<typeof proposalRowSchema>[],
): ScheduleChangeRequest {
  return {
    id: row.id,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    encounterId: asEncounterId(row.encounter_id),
    requestingTeamId: asTeamId(row.requesting_team_id),
    initiatedByActorId: asActorId(row.initiated_by_actor_id),
    scope: rehydrateScope(row.scope_type, row.official_slot),
    status: row.status,
    proposals: asProposalList(proposalRows.map(rehydrateProposal)),
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rehydrateProposal(row: z.infer<typeof proposalRowSchema>): ScheduleChangeProposal {
  return {
    id: row.id,
    proposedStartAt: row.proposed_start_at,
    proposedByActorId: asActorId(row.proposed_by_actor_id),
    proposedByTeamId: asTeamId(row.proposed_by_team_id),
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function asProposalList(
  proposals: readonly ScheduleChangeProposal[],
): ScheduleChangeRequest["proposals"] {
  const [first, ...rest] = proposals;
  if (!first) {
    throw new TypeError("Schedule change request is missing proposals");
  }
  return [first, ...rest];
}
