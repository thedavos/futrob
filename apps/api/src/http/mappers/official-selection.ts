import {
  officialSelectionCommandResponseSchema,
  officialSelectionViewSchema,
  type MatchDisputeDto,
  type OfficialSelectionActionDto,
  type OfficialSelectionCommandResponse,
  type OfficialSelectionProposalDto,
  type OfficialSelectionViewDto,
} from "@futrob/api-contracts";
import type {
  ConfirmationAction,
  ConfirmOfficialSelectionError,
  GetOfficialSelectionError,
  MatchDispute,
  OfficialMatchSelection,
  OfficialSelectionCommandOutput,
  OfficialSelectionProposal,
  OfficialSelectionView,
  OpenMatchDisputeError,
  ProposeAlternativeOfficialSelectionError,
  ProposeOfficialSelectionError,
  RejectOfficialSelectionError,
} from "@futrob/results";
import { failureToHttp } from "@/http/errors.ts";

export type TeamOfficialSelectionError =
  | GetOfficialSelectionError
  | ProposeOfficialSelectionError
  | ConfirmOfficialSelectionError
  | RejectOfficialSelectionError
  | ProposeAlternativeOfficialSelectionError
  | OpenMatchDisputeError;

/**
 * Status of every expected failure of the Team selection routes. Keyed by the
 * error union so a new Results failure does not compile until it has a status.
 */
export const TEAM_OFFICIAL_SELECTION_ERROR_STATUS = {
  "results.encounter_not_found": 404,
  "results.selection_not_found": 404,
  "results.official_selection_forbidden": 403,
  "results.official_result_forbidden": 403,
  "results.self_confirmation_forbidden": 403,
  "results.invalid_selection": 400,
  "results.duplicate_provider_match": 400,
  "results.reason_required": 400,
  "results.candidate_not_associated": 409,
  "results.provider_match_snapshot_missing": 409,
  "results.reference_already_claimed": 409,
  "results.selection_not_confirmable": 409,
  "results.selection_version_conflict": 409,
  "results.selection_proposal_stale": 409,
  "results.selection_state_conflict": 409,
  "results.selection_already_approved": 409,
  "results.command_key_reused": 409,
  "results.confirmation_window_closed": 409,
} as const satisfies Record<TeamOfficialSelectionError["code"], number>;

export function teamOfficialSelectionFailureToHttp(error: TeamOfficialSelectionError): Response {
  return failureToHttp(error, TEAM_OFFICIAL_SELECTION_ERROR_STATUS[error.code]);
}

function toSelectionDto(selection: OfficialMatchSelection) {
  return {
    id: selection.id,
    encounterId: selection.encounterId,
    organizationId: selection.organizationId,
    competitionId: selection.competitionId,
    status: selection.status,
    version: selection.version,
    round: selection.round,
    currentProposalId: selection.currentProposalId,
    createdAt: selection.createdAt.toISOString(),
    updatedAt: selection.updatedAt.toISOString(),
  };
}

function toProposalDto(proposal: OfficialSelectionProposal): OfficialSelectionProposalDto {
  return {
    id: proposal.id,
    round: proposal.round,
    sequence: proposal.sequence,
    proposingTeamId: proposal.proposingTeamId,
    proposedByActorId: proposal.proposedByActorId,
    slots: proposal.slots.map((slot) => ({
      officialSlot: slot.officialSlot,
      providerMatchRef: slot.providerMatchRef,
    })),
    supersedesProposalId: proposal.supersedesProposalId,
    reason: proposal.reason,
    createdAt: proposal.createdAt.toISOString(),
    confirmationDeadline: proposal.confirmationDeadline.toISOString(),
  };
}

// The command key and request fingerprint stay server-side.
function toActionDto(action: ConfirmationAction): OfficialSelectionActionDto {
  return {
    id: action.id,
    proposalId: action.proposalId,
    type: action.type,
    fromStatus: action.fromStatus,
    toStatus: action.toStatus,
    versionBefore: action.versionBefore,
    versionAfter: action.versionAfter,
    actorId: action.actorId,
    teamId: action.teamId,
    capacity: action.capacity,
    reason: action.reason,
    officialResultId: action.officialResultId,
    details: action.details
      ? {
          integrityFlags: action.details.integrityFlags?.map((flag) => ({ ...flag })),
          acknowledgedFlags: action.details.acknowledgedFlags?.map((flag) => ({ ...flag })),
          conflictingReference: action.details.conflictingReference,
          selectedProposalId: action.details.selectedProposalId,
          disputeId: action.details.disputeId,
          confirmationDeadline: action.details.confirmationDeadline,
          processedAt: action.details.processedAt,
        }
      : null,
    occurredAt: action.occurredAt.toISOString(),
  };
}

function toDisputeDto(dispute: MatchDispute): MatchDisputeDto {
  return {
    id: dispute.id,
    status: dispute.status,
    openedByActorId: dispute.openedByActorId,
    openedByTeamId: dispute.openedByTeamId,
    openedReason: dispute.openedReason,
    openedAt: dispute.openedAt.toISOString(),
    reviewStartedAt: dispute.reviewStartedAt?.toISOString() ?? null,
    resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
    resolution: dispute.resolution,
    resolutionProposalId: dispute.resolutionProposalId,
    resolutionReason: dispute.resolutionReason,
  };
}

export function toOfficialSelectionViewDto(view: OfficialSelectionView): OfficialSelectionViewDto {
  return officialSelectionViewSchema.parse({
    encounterId: view.encounterId,
    selection: view.selection ? toSelectionDto(view.selection) : null,
    proposals: view.proposals.map(toProposalDto),
    actions: view.actions.map(toActionDto),
    disputes: view.disputes.map(toDisputeDto),
    activeDispute: view.activeDispute ? toDisputeDto(view.activeDispute) : null,
    approvedResultId: view.approvedResultId,
    integrityFlags: view.integrityFlags,
    allowedActions: view.allowedActions,
  });
}

export function toOfficialSelectionCommandResponse(
  output: OfficialSelectionCommandOutput,
): OfficialSelectionCommandResponse {
  const approved = output.approvedResult;
  return officialSelectionCommandResponseSchema.parse({
    selection: toSelectionDto(output.selection),
    proposal: output.proposal ? toProposalDto(output.proposal) : null,
    actions: output.actions.map(toActionDto),
    dispute: output.dispute ? toDisputeDto(output.dispute) : null,
    approvedResult: approved
      ? {
          id: approved.id,
          revision: approved.revision,
          status: approved.status,
          approvalBasis: approved.approvalBasis ?? null,
          proposalId: approved.proposalId ?? null,
          approvedAt: approved.approvedAt.toISOString(),
        }
      : null,
    integrityFlags: output.integrityFlags,
    replayed: output.replayed,
  });
}
