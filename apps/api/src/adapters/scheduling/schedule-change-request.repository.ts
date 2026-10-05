import {
  rescheduleScopesConflict,
  type ScheduleChangeCommandReceipt,
  type ScheduleChangeCommitOutcome,
  type ScheduleChangeRequest,
  type ScheduleChangeRequestRepository,
  type ScheduleChangeTransition,
} from "@futrob/scheduling";
import {
  compareTime,
  type ActorId,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
  type TeamId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import {
  getPgExecutor,
  isInPgTransaction,
  type PgExecutor,
} from "@/adapters/persistence/pg-transaction.ts";
import {
  decisionRowSchema,
  insertProposals,
  proposalRowSchema,
  receiptRowSchema,
  rehydrateReceipt,
  rehydrateRequest,
  requestRowSchema,
  requestSelectSql,
  scopeColumns,
  type RequestRow,
} from "./schedule-change-request-rows.ts";
import { writeScheduleChangeTransition } from "./schedule-change-transition.write.ts";
import {
  activeScopeConflict,
  idempotencyConflict,
  mapScheduleChangeRequestWriteError,
} from "./schedule-change-request.write-error.ts";

export interface CountAcceptedReschedulesInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly encounterId: EncounterId;
  readonly teamId: TeamId;
}

export class InMemoryScheduleChangeRequestRepository implements ScheduleChangeRequestRepository {
  readonly rows = new Map<string, ScheduleChangeRequest>();
  readonly receipts: ScheduleChangeCommandReceipt[] = [];

  async findById(
    organizationId: OrganizationId,
    requestId: string,
  ): Promise<ScheduleChangeRequest | null> {
    const request = this.rows.get(requestId);
    return request?.organizationId === organizationId ? request : null;
  }

  async findCommandReceipt(
    organizationId: OrganizationId,
    actorId: ActorId,
    commandKey: string,
  ): Promise<ScheduleChangeCommandReceipt | null> {
    return (
      this.receipts.find(
        (receipt) =>
          receipt.organizationId === organizationId &&
          receipt.actorId === actorId &&
          receipt.commandKey === commandKey,
      ) ?? null
    );
  }

  async commit(
    transition: ScheduleChangeTransition,
    receipt: ScheduleChangeCommandReceipt,
  ): Promise<ScheduleChangeCommitOutcome> {
    const stored = await this.findById(transition.request.organizationId, transition.request.id);
    if (!stored || stored.version !== transition.expectedVersion) {
      return { kind: "version_conflict", currentVersion: stored?.version ?? 0 };
    }
    if (
      await this.findCommandReceipt(receipt.organizationId, receipt.actorId, receipt.commandKey)
    ) {
      throw idempotencyConflict();
    }
    this.rows.set(transition.request.id, transition.request);
    this.receipts.push(receipt);
    return { kind: "committed" };
  }

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
    const requests = await this.listByEncounter(organizationId, encounterId);
    return requests.filter((request) => request.status === "open");
  }

  async listByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly ScheduleChangeRequest[]> {
    return [...this.rows.values()]
      .filter(
        (request) =>
          request.organizationId === organizationId && request.encounterId === encounterId,
      )
      .sort((left, right) => {
        const time = compareTime(left.createdAt, right.createdAt);
        if (time !== 0) return time;
        return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
      });
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

  async findById(
    organizationId: OrganizationId,
    requestId: string,
  ): Promise<ScheduleChangeRequest | null> {
    const result = await getPgExecutor(this.pool).query(
      `${requestSelectSql}
       WHERE request.organization_id = $1 AND request.id = $2`,
      [organizationId, requestId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.rehydrateWithProposals(requestRowSchema.parse(row));
  }

  async findCommandReceipt(
    organizationId: OrganizationId,
    actorId: ActorId,
    commandKey: string,
  ): Promise<ScheduleChangeCommandReceipt | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, request_id, organization_id, actor_id, command_key, command_type, fingerprint,
              target_proposal_id, resulting_version, resulting_status, created_proposal_id,
              decision_id, occurred_at
       FROM schedule_change_command_receipts
       WHERE organization_id = $1 AND actor_id = $2 AND command_key = $3`,
      [organizationId, actorId, commandKey],
    );
    const row = result.rows[0];
    return row ? rehydrateReceipt(receiptRowSchema.parse(row)) : null;
  }

  async commit(
    transition: ScheduleChangeTransition,
    receipt: ScheduleChangeCommandReceipt,
  ): Promise<ScheduleChangeCommitOutcome> {
    if (isInPgTransaction()) {
      return writeScheduleChangeTransition(getPgExecutor(this.pool), transition, receipt);
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const outcome = await writeScheduleChangeTransition(client, transition, receipt);
      await client.query(outcome.kind === "committed" ? "COMMIT" : "ROLLBACK");
      return outcome;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Prefer the original write error over a secondary rollback error.
      }
      throw error;
    } finally {
      client.release();
    }
  }

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
    return Promise.all(
      result.rows.map((row) => this.rehydrateWithProposals(requestRowSchema.parse(row))),
    );
  }

  async listByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly ScheduleChangeRequest[]> {
    const result = await getPgExecutor(this.pool).query(
      `${requestSelectSql}
       WHERE request.organization_id = $1
         AND request.encounter_id = $2
       ORDER BY request.created_at ASC, request.id ASC`,
      [organizationId, encounterId],
    );
    return Promise.all(
      result.rows.map((row) => this.rehydrateWithProposals(requestRowSchema.parse(row))),
    );
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
        if (error instanceof Error) {
          throw mapScheduleChangeRequestWriteError(error, request);
        }
        throw error;
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
      if (error instanceof Error) {
        throw mapScheduleChangeRequestWriteError(error, request);
      }
      throw error;
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
         created_at, updated_at, version
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        request.version,
      ],
    );
    if (!upserted.rows[0]) return;

    await insertProposals(executor, request, request.proposals, 1);
  }

  private async rehydrateWithProposals(row: RequestRow): Promise<ScheduleChangeRequest> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, request_id, organization_id, proposed_start_at, proposed_by_actor_id,
              proposed_by_team_id, reason, created_at, proposal_order
       FROM schedule_change_proposals
       WHERE organization_id = $1 AND request_id = $2
       ORDER BY proposal_order ASC, created_at ASC`,
      [row.organization_id, row.id],
    );
    const decisions = await getPgExecutor(this.pool).query(
      `SELECT id, proposal_id, request_version, kind, authority, team_id, actor_id, reason,
              created_at
       FROM schedule_change_decisions
       WHERE organization_id = $1 AND request_id = $2
       ORDER BY request_version ASC, created_at ASC, id ASC`,
      [row.organization_id, row.id],
    );
    return rehydrateRequest(
      row,
      result.rows.map((proposal) => proposalRowSchema.parse(proposal)),
      decisions.rows.map((decision) => decisionRowSchema.parse(decision)),
    );
  }
}
