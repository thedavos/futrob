import {
  currentScheduleChangeProposal,
  type ListScheduleChangeRequestsOutput,
  type RescheduleScope,
  type ScheduleChangeCommandOutput,
  type ScheduleChangeRequest,
  type ScheduleChangeRequestCapabilities,
  type ScheduleChangeResponder,
} from "@futrob/scheduling";
import type {
  ListScheduleChangeRequestsResponse,
  ScheduleChangeCommandResponse,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";

/** Create and command responses carry no capabilities; clients refetch the list. */
const NO_CAPABILITIES: ScheduleChangeRequestCapabilities = {
  allowedActions: [],
  respondAs: null,
  blockedActions: [],
};

export function toScheduleChangeListResponse(
  output: ListScheduleChangeRequestsOutput,
): ListScheduleChangeRequestsResponse {
  const { creation } = output;
  return {
    requests: output.requests.map((view) =>
      toScheduleChangeRequestDto(view.request, view.capabilities),
    ),
    creation: {
      blockedReason: creation.blockedReason,
      teams: creation.teams.map((team) => ({
        teamId: team.teamId,
        blockedReason: team.blockedReason,
      })),
      scopes: creation.scopes.map((option) => ({
        scope: toScopeDto(option.scope),
        currentStartAt: option.currentStartAt.toISOString(),
        blockedReason: option.blockedReason,
      })),
    },
  };
}

export function toScheduleChangeRequestDto(
  request: ScheduleChangeRequest,
  capabilities: ScheduleChangeRequestCapabilities = NO_CAPABILITIES,
): ScheduleChangeRequestDto {
  const { application } = request;
  return {
    id: request.id,
    organizationId: request.organizationId,
    competitionId: request.competitionId,
    encounterId: request.encounterId,
    requestingTeamId: request.requestingTeamId,
    initiatedByActorId: request.initiatedByActorId,
    scope: toScopeDto(request.scope),
    status: request.status,
    version: request.version,
    currentProposalId: currentScheduleChangeProposal(request).id,
    proposals: request.proposals.map((proposal) => ({
      id: proposal.id,
      proposedStartAt: proposal.proposedStartAt.toISOString(),
      proposedByActorId: proposal.proposedByActorId,
      proposedByTeamId: proposal.proposedByTeamId,
      reason: proposal.reason,
      createdAt: proposal.createdAt.toISOString(),
      responseDeadline: proposal.responseDeadline.toISOString(),
    })),
    decisions: request.decisions.map((decision) => ({
      id: decision.id,
      proposalId: decision.proposalId,
      requestVersion: decision.requestVersion,
      kind: decision.kind,
      responder: toResponderDto(decision.responder),
      actorId: decision.actorId,
      reason: decision.reason,
      createdAt: decision.createdAt.toISOString(),
    })),
    allowedActions: [...capabilities.allowedActions],
    respondAs: capabilities.respondAs && toResponderDto(capabilities.respondAs),
    blockedActions: [...capabilities.blockedActions],
    actions: request.actions.map((action) => ({
      ...action,
      responseDeadline: action.responseDeadline.toISOString(),
      processedAt: action.processedAt.toISOString(),
      resolution:
        action.resolution?.outcome === "schedule_set"
          ? {
              ...action.resolution,
              proposedStartAt: action.resolution.proposedStartAt.toISOString(),
            }
          : action.resolution,
    })),
    application: application
      ? {
          id: application.id,
          proposalId: application.proposalId,
          requestVersion: application.requestVersion,
          appliedByActorId: application.appliedByActorId,
          previousEncounterStartAt: application.previousEncounterStartAt.toISOString(),
          appliedEncounterStartAt: application.appliedEncounterStartAt.toISOString(),
          slots: application.slots.map((slot) => ({
            officialSlot: slot.slot,
            previousStartAt: slot.previousStartAt.toISOString(),
            appliedStartAt: slot.appliedStartAt.toISOString(),
          })),
          appliedAt: application.appliedAt.toISOString(),
        }
      : null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

export function toScheduleChangeCommandResponse(
  output: ScheduleChangeCommandOutput,
): ScheduleChangeCommandResponse {
  return { request: toScheduleChangeRequestDto(output.request), replayed: output.replayed };
}

function toScopeDto(scope: RescheduleScope): ScheduleChangeRequestDto["scope"] {
  return scope.type === "entire_encounter"
    ? { type: "entire_encounter" }
    : { type: "official_match", officialSlot: scope.officialSlot };
}

function toResponderDto(
  responder: ScheduleChangeResponder,
): NonNullable<ScheduleChangeRequestDto["respondAs"]> {
  return responder.authority === "rival_team"
    ? { authority: "rival_team", teamId: responder.teamId }
    : { authority: "organizer" };
}
