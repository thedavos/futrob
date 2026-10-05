import type {
  RescheduleScope,
  ScheduleChangeCommandReceipt,
  ScheduleChangeDecision,
  ScheduleChangeProposal,
  ScheduleChangeRequest,
} from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { z } from "zod";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import type { PgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export const requestSelectSql = `SELECT request.id, request.organization_id, request.competition_id,
       request.encounter_id, request.requesting_team_id, request.initiated_by_actor_id,
       request.scope_type, request.official_slot, request.status, request.version,
       request.idempotency_key, request.created_at, request.updated_at
FROM schedule_change_requests AS request`;

const requestStatusSchema = z.enum([
  "open",
  "accepted",
  "rejected",
  "cancelled",
  "expired",
  "escalated",
]);

export const requestRowSchema = z.object({
  id: pgTextSchema,
  organization_id: pgTextSchema,
  competition_id: pgTextSchema,
  encounter_id: pgTextSchema,
  requesting_team_id: pgTextSchema,
  initiated_by_actor_id: pgTextSchema,
  scope_type: z.enum(["entire_encounter", "official_match"]),
  official_slot: z.union([z.null(), z.coerce.number().pipe(z.union([z.literal(1), z.literal(2)]))]),
  status: requestStatusSchema,
  version: z.coerce.number().int().positive(),
  idempotency_key: pgTextSchema,
  created_at: pgTimestampSchema,
  updated_at: pgTimestampSchema,
});

export const proposalRowSchema = z.object({
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

export const decisionRowSchema = z.object({
  id: pgTextSchema,
  proposal_id: pgTextSchema,
  request_version: z.coerce.number().int().positive(),
  kind: z.enum(["consent", "rejection"]),
  authority: z.enum(["rival_team", "organizer"]),
  team_id: pgTextSchema.nullable(),
  actor_id: pgTextSchema,
  reason: pgTextSchema.nullable(),
  created_at: pgTimestampSchema,
});

export const receiptRowSchema = z.object({
  id: pgTextSchema,
  request_id: pgTextSchema,
  organization_id: pgTextSchema,
  actor_id: pgTextSchema,
  command_key: pgTextSchema,
  command_type: z.enum(["accept", "reject", "counter"]),
  fingerprint: pgTextSchema,
  target_proposal_id: pgTextSchema,
  resulting_version: z.coerce.number().int().positive(),
  resulting_status: requestStatusSchema,
  created_proposal_id: pgTextSchema.nullable(),
  decision_id: pgTextSchema.nullable(),
  occurred_at: pgTimestampSchema,
});

/** Proposals are append-only: existing rows are never rewritten or reordered. */
export async function insertProposals(
  executor: PgExecutor,
  request: ScheduleChangeRequest,
  proposals: readonly ScheduleChangeProposal[],
  firstOrder: number,
): Promise<void> {
  const values = proposals.flatMap((proposal, index) => [
    proposal.id,
    request.id,
    request.organizationId,
    proposal.proposedStartAt.toISOString(),
    proposal.proposedByActorId,
    proposal.proposedByTeamId,
    proposal.reason,
    proposal.createdAt.toISOString(),
    firstOrder + index,
  ]);
  const placeholders = proposals
    .map((_, index) => {
      const offset = index * 9;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
    })
    .join(", ");
  await executor.query(
    `INSERT INTO schedule_change_proposals (
       id, request_id, organization_id, proposed_start_at, proposed_by_actor_id,
       proposed_by_team_id, reason, created_at, proposal_order
     ) VALUES ${placeholders}
     ON CONFLICT (id) DO NOTHING`,
    values,
  );
}

export async function insertDecision(
  executor: PgExecutor,
  request: ScheduleChangeRequest,
  decision: ScheduleChangeDecision,
): Promise<void> {
  await executor.query(
    `INSERT INTO schedule_change_decisions (
       id, request_id, organization_id, proposal_id, request_version, kind, authority,
       team_id, actor_id, reason, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      decision.id,
      request.id,
      request.organizationId,
      decision.proposalId,
      decision.requestVersion,
      decision.kind,
      decision.responder.authority,
      decision.responder.authority === "rival_team" ? decision.responder.teamId : null,
      decision.actorId,
      decision.reason,
      decision.createdAt.toISOString(),
    ],
  );
}

export async function insertReceipt(
  executor: PgExecutor,
  receipt: ScheduleChangeCommandReceipt,
): Promise<void> {
  await executor.query(
    `INSERT INTO schedule_change_command_receipts (
       id, request_id, organization_id, actor_id, command_key, command_type, fingerprint,
       target_proposal_id, resulting_version, resulting_status, created_proposal_id,
       decision_id, occurred_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      receipt.id,
      receipt.requestId,
      receipt.organizationId,
      receipt.actorId,
      receipt.commandKey,
      receipt.commandType,
      receipt.fingerprint,
      receipt.targetProposalId,
      receipt.resultingVersion,
      receipt.resultingStatus,
      receipt.createdProposalId,
      receipt.decisionId,
      receipt.occurredAt.toISOString(),
    ],
  );
}

export function scopeColumns(scope: RescheduleScope) {
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

export function rehydrateRequest(
  row: z.infer<typeof requestRowSchema>,
  proposalRows: readonly z.infer<typeof proposalRowSchema>[],
  decisionRows: readonly z.infer<typeof decisionRowSchema>[],
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
    version: row.version,
    proposals: asProposalList(proposalRows.map(rehydrateProposal)),
    decisions: decisionRows.map(rehydrateDecision),
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

function rehydrateDecision(row: z.infer<typeof decisionRowSchema>): ScheduleChangeDecision {
  let responder: ScheduleChangeDecision["responder"];
  if (row.authority === "rival_team") {
    if (!row.team_id) throw new TypeError(`Rival decision ${row.id} is missing its Team`);
    responder = { authority: "rival_team", teamId: asTeamId(row.team_id) };
  } else {
    responder = { authority: "organizer" };
  }
  return {
    id: row.id,
    proposalId: row.proposal_id,
    requestVersion: row.request_version,
    kind: row.kind,
    responder,
    actorId: asActorId(row.actor_id),
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export function rehydrateReceipt(
  row: z.infer<typeof receiptRowSchema>,
): ScheduleChangeCommandReceipt {
  return {
    id: row.id,
    organizationId: asOrganizationId(row.organization_id),
    requestId: row.request_id,
    actorId: asActorId(row.actor_id),
    commandKey: row.command_key,
    commandType: row.command_type,
    fingerprint: row.fingerprint,
    targetProposalId: row.target_proposal_id,
    resultingVersion: row.resulting_version,
    resultingStatus: row.resulting_status,
    createdProposalId: row.created_proposal_id,
    decisionId: row.decision_id,
    occurredAt: row.occurred_at,
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

export type RequestRow = z.infer<typeof requestRowSchema>;
