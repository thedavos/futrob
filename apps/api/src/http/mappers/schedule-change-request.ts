import type { ScheduleChangeRequest } from "@futrob/scheduling";
import type { ScheduleChangeRequestDto } from "@futrob/api-contracts";

export function toScheduleChangeRequestDto(
  request: ScheduleChangeRequest,
): ScheduleChangeRequestDto {
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
    proposals: request.proposals.map((proposal) => ({
      id: proposal.id,
      proposedStartAt: proposal.proposedStartAt.toISOString(),
      proposedByActorId: proposal.proposedByActorId,
      proposedByTeamId: proposal.proposedByTeamId,
      reason: proposal.reason,
      createdAt: proposal.createdAt.toISOString(),
    })),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}
