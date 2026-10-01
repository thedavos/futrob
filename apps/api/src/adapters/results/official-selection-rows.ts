import { gameDataProviderKeyQuerySchema } from "@futrob/api-contracts";
import type {
  ConfirmationAction,
  ConfirmationActionDetails,
  MatchDispute,
  OfficialMatchSelection,
  OfficialSelectionProposal,
} from "@futrob/results";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { parseJsonColumn, type PgJsonInput } from "@/adapters/persistence/parse-json-column.ts";
import {
  pgNullableTextSchema,
  pgTextSchema,
  pgTimestampSchema,
} from "@/adapters/persistence/pg-scalar.ts";

export const externalReferenceSchema = z.object({
  providerKey: gameDataProviderKeyQuerySchema,
  externalId: z.string(),
});

const pgNullableTimestampSchema = z
  .union([z.null(), z.undefined(), pgTimestampSchema])
  .transform((value) => value ?? null);

const selectionStatusSchema = z.enum([
  "awaiting_provider_data",
  "candidates_available",
  "selection_in_progress",
  "awaiting_opponent_confirmation",
  "confirmed",
  "disputed",
  "organizer_review",
  "approved",
  "voided",
]);

export const selectionRowSchema = z.object({
  id: pgTextSchema,
  encounter_id: pgTextSchema,
  organization_id: pgTextSchema,
  competition_id: pgTextSchema,
  status: selectionStatusSchema,
  version: z.coerce.number(),
  round: z.coerce.number(),
  current_proposal_id: pgNullableTextSchema,
  created_at: pgTimestampSchema,
  updated_at: pgTimestampSchema,
});

const proposalSlotsSchema = z.array(
  z.object({
    officialSlot: z.union([z.literal(1), z.literal(2)]),
    providerMatchRef: externalReferenceSchema,
  }),
);

export const proposalRowSchema = z.object({
  id: pgTextSchema,
  selection_id: pgTextSchema,
  organization_id: pgTextSchema,
  competition_id: pgTextSchema,
  encounter_id: pgTextSchema,
  round: z.coerce.number(),
  sequence: z.coerce.number(),
  proposing_team_id: pgNullableTextSchema,
  proposed_by_actor_id: pgTextSchema,
  slots: z.custom<PgJsonInput>((value) => value !== undefined),
  supersedes_proposal_id: pgNullableTextSchema,
  reason: pgNullableTextSchema,
  created_at: pgTimestampSchema,
});

const integrityFlagSchema = z.object({
  code: z.enum(["provider_data_incomplete", "provider_match_disconnected"]),
  providerMatchRef: externalReferenceSchema,
});

const actionDetailsSchema = z.object({
  integrityFlags: z.array(integrityFlagSchema).optional(),
  acknowledgedFlags: z.array(integrityFlagSchema).optional(),
  conflictingReference: externalReferenceSchema.optional(),
  selectedProposalId: z.string().optional(),
  disputeId: z.string().optional(),
});

export const actionRowSchema = z.object({
  id: pgTextSchema,
  selection_id: pgNullableTextSchema,
  proposal_id: pgNullableTextSchema,
  organization_id: pgTextSchema,
  competition_id: pgTextSchema,
  encounter_id: pgTextSchema,
  action_type: z.enum([
    "proposed",
    "confirmed",
    "approved",
    "integrity_review_required",
    "rejected",
    "alternative_proposed",
    "dispute_opened",
    "review_started",
    "dispute_resolved_approved",
    "returned_to_selection",
    "voided",
    "reference_reuse_rejected",
    "legacy_review_required",
  ]),
  from_status: z.union([z.null(), selectionStatusSchema]),
  to_status: z.union([z.null(), selectionStatusSchema]),
  version_before: z.coerce.number(),
  version_after: z.coerce.number(),
  actor_id: pgTextSchema,
  team_id: pgNullableTextSchema,
  capacity: z.enum(["team", "operator", "system"]),
  reason: pgNullableTextSchema,
  command_key: pgNullableTextSchema,
  request_fingerprint: pgNullableTextSchema,
  official_result_id: pgNullableTextSchema,
  details: z.custom<PgJsonInput>((value) => value !== undefined),
  occurred_at: pgTimestampSchema,
});

export const disputeRowSchema = z.object({
  id: pgTextSchema,
  selection_id: pgTextSchema,
  organization_id: pgTextSchema,
  competition_id: pgTextSchema,
  encounter_id: pgTextSchema,
  status: z.enum(["open", "under_review", "resolved"]),
  opened_by_actor_id: pgTextSchema,
  opened_by_team_id: pgTextSchema,
  opened_reason: pgTextSchema,
  opened_at: pgTimestampSchema,
  review_started_by_actor_id: pgNullableTextSchema,
  review_started_at: pgNullableTimestampSchema,
  resolved_by_actor_id: pgNullableTextSchema,
  resolved_at: pgNullableTimestampSchema,
  resolution: z.union([z.null(), z.enum(["approved_proposal", "returned_to_selection"])]),
  resolution_proposal_id: pgNullableTextSchema,
  resolution_reason: pgNullableTextSchema,
});

export type PgQuery = Pick<Pool, "query">;

export const ACTION_COLUMNS = `id, selection_id, proposal_id, organization_id, competition_id, encounter_id,
  action_type, from_status, to_status, version_before, version_after, actor_id, team_id, capacity,
  reason, command_key, request_fingerprint, official_result_id, details, occurred_at`;

export async function insertProposal(
  db: PgQuery,
  proposal: OfficialSelectionProposal,
): Promise<void> {
  await db.query(
    `INSERT INTO official_selection_proposals (
       id, selection_id, organization_id, competition_id, encounter_id, round, sequence,
       proposing_team_id, proposed_by_actor_id, slots, supersedes_proposal_id, reason, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13)`,
    [
      proposal.id,
      proposal.selectionId,
      proposal.organizationId,
      proposal.competitionId,
      proposal.encounterId,
      proposal.round,
      proposal.sequence,
      proposal.proposingTeamId,
      proposal.proposedByActorId,
      JSON.stringify(proposal.slots),
      proposal.supersedesProposalId,
      proposal.reason,
      proposal.createdAt.toISOString(),
    ],
  );
}

export async function insertAction(db: PgQuery, action: ConfirmationAction): Promise<void> {
  await db.query(
    `INSERT INTO official_selection_actions (
       id, selection_id, proposal_id, organization_id, competition_id, encounter_id,
       action_type, from_status, to_status, version_before, version_after, actor_id, team_id,
       capacity, reason, command_key, request_fingerprint, official_result_id, details,
       occurred_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
       $19::jsonb, $20
     )`,
    [
      action.id,
      action.selectionId,
      action.proposalId,
      action.organizationId,
      action.competitionId,
      action.encounterId,
      action.type,
      action.fromStatus,
      action.toStatus,
      action.versionBefore,
      action.versionAfter,
      action.actorId,
      action.teamId,
      action.capacity,
      action.reason,
      action.commandKey,
      action.requestFingerprint,
      action.officialResultId,
      action.details === null ? null : JSON.stringify(action.details),
      action.occurredAt.toISOString(),
    ],
  );
}

export async function insertDispute(db: PgQuery, dispute: MatchDispute): Promise<void> {
  await db.query(
    `INSERT INTO match_disputes (
       id, selection_id, organization_id, competition_id, encounter_id, status,
       opened_by_actor_id, opened_by_team_id, opened_reason, opened_at,
       review_started_by_actor_id, review_started_at, resolved_by_actor_id, resolved_at,
       resolution, resolution_proposal_id, resolution_reason
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    disputeParameters(dispute),
  );
}

export async function updateDispute(db: PgQuery, dispute: MatchDispute): Promise<void> {
  const result = await db.query(
    `UPDATE match_disputes SET
       selection_id = $2, organization_id = $3, competition_id = $4, encounter_id = $5,
       status = $6, opened_by_actor_id = $7, opened_by_team_id = $8, opened_reason = $9,
       opened_at = $10, review_started_by_actor_id = $11, review_started_at = $12,
       resolved_by_actor_id = $13, resolved_at = $14, resolution = $15,
       resolution_proposal_id = $16, resolution_reason = $17
     WHERE id = $1`,
    disputeParameters(dispute),
  );
  if (result.rowCount !== 1) throw new Error(`Unknown dispute ${dispute.id}`);
}

function disputeParameters(dispute: MatchDispute): unknown[] {
  return [
    dispute.id,
    dispute.selectionId,
    dispute.organizationId,
    dispute.competitionId,
    dispute.encounterId,
    dispute.status,
    dispute.openedByActorId,
    dispute.openedByTeamId,
    dispute.openedReason,
    dispute.openedAt.toISOString(),
    dispute.reviewStartedByActorId,
    dispute.reviewStartedAt?.toISOString() ?? null,
    dispute.resolvedByActorId,
    dispute.resolvedAt?.toISOString() ?? null,
    dispute.resolution,
    dispute.resolutionProposalId,
    dispute.resolutionReason,
  ];
}

export function rehydrateSelection(
  row: z.infer<typeof selectionRowSchema>,
): OfficialMatchSelection {
  return {
    id: row.id,
    encounterId: asEncounterId(row.encounter_id),
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    status: row.status,
    version: row.version,
    round: row.round,
    currentProposalId: row.current_proposal_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rehydrateProposal(
  row: z.infer<typeof proposalRowSchema>,
): OfficialSelectionProposal {
  return {
    id: row.id,
    selectionId: row.selection_id,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    encounterId: asEncounterId(row.encounter_id),
    round: row.round,
    sequence: row.sequence,
    proposingTeamId: row.proposing_team_id,
    proposedByActorId: asActorId(row.proposed_by_actor_id),
    slots: parseJsonColumn(proposalSlotsSchema, row.slots),
    supersedesProposalId: row.supersedes_proposal_id,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export function rehydrateAction(row: z.infer<typeof actionRowSchema>): ConfirmationAction {
  const details: ConfirmationActionDetails | null =
    row.details === null ? null : parseJsonColumn(actionDetailsSchema, row.details);
  return {
    id: row.id,
    selectionId: row.selection_id,
    proposalId: row.proposal_id,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    encounterId: asEncounterId(row.encounter_id),
    type: row.action_type,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    versionBefore: row.version_before,
    versionAfter: row.version_after,
    actorId: asActorId(row.actor_id),
    teamId: row.team_id === null ? null : asTeamId(row.team_id),
    capacity: row.capacity,
    reason: row.reason,
    commandKey: row.command_key,
    requestFingerprint: row.request_fingerprint,
    officialResultId: row.official_result_id,
    details,
    occurredAt: row.occurred_at,
  };
}

export function rehydrateDispute(row: z.infer<typeof disputeRowSchema>): MatchDispute {
  return {
    id: row.id,
    selectionId: row.selection_id,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    encounterId: asEncounterId(row.encounter_id),
    status: row.status,
    openedByActorId: asActorId(row.opened_by_actor_id),
    openedByTeamId: asTeamId(row.opened_by_team_id),
    openedReason: row.opened_reason,
    openedAt: row.opened_at,
    reviewStartedByActorId:
      row.review_started_by_actor_id === null ? null : asActorId(row.review_started_by_actor_id),
    reviewStartedAt: row.review_started_at,
    resolvedByActorId:
      row.resolved_by_actor_id === null ? null : asActorId(row.resolved_by_actor_id),
    resolvedAt: row.resolved_at,
    resolution: row.resolution,
    resolutionProposalId: row.resolution_proposal_id,
    resolutionReason: row.resolution_reason,
  };
}
