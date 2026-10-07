import {
  currentScheduleChangeProposal,
  type ScheduleChangeCommandOutput,
  type ScheduleChangeRequest,
} from "@futrob/scheduling";
import type {
  ScheduleChangeCommandResponse,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";

export function toScheduleChangeRequestDto(
  request: ScheduleChangeRequest,
): ScheduleChangeRequestDto {
  const { application } = request;
  return {
    id: request.id,
    organizationId: request.organizationId,
    competitionId: request.competitionId,
    encounterId: request.encounterId,
    requestingTeamId: request.requestingTeamId,
    initiatedByActorId: request.initiatedByActorId,
    scope:
      request.scope.type === "entire_encounter"
        ? { type: "entire_encounter" }
        : { type: "official_match", officialSlot: request.scope.officialSlot },
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
    })),
    decisions: request.decisions.map((decision) => ({
      id: decision.id,
      proposalId: decision.proposalId,
      requestVersion: decision.requestVersion,
      kind: decision.kind,
      responder:
        decision.responder.authority === "rival_team"
          ? { authority: "rival_team", teamId: decision.responder.teamId }
          : { authority: "organizer" },
      actorId: decision.actorId,
      reason: decision.reason,
      createdAt: decision.createdAt.toISOString(),
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
