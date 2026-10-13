import type { ScheduleChangeRequestDto } from "@futrob/api-contracts";

export function escalatedScheduleChange(
  overrides: Partial<ScheduleChangeRequestDto> = {},
): ScheduleChangeRequestDto {
  return {
    id: "request-1",
    organizationId: "org-1",
    competitionId: "competition-1",
    encounterId: "encounter-1",
    requestingTeamId: "team-home",
    initiatedByActorId: "captain-home",
    scope: { type: "entire_encounter" },
    status: "escalated",
    version: 3,
    currentProposalId: "proposal-2",
    proposals: [
      {
        id: "proposal-1",
        proposedStartAt: "2026-11-03T01:00:00.000Z",
        proposedByActorId: "captain-home",
        proposedByTeamId: "team-home",
        reason: "Necesitamos otro horario por disponibilidad de plantilla.",
        createdAt: "2026-11-01T08:00:00.000Z",
        responseDeadline: "2026-11-01T20:00:00.000Z",
      },
      {
        id: "proposal-2",
        proposedStartAt: "2026-11-03T02:30:00.000Z",
        proposedByActorId: "captain-away",
        proposedByTeamId: "team-away",
        reason: "Podemos jugar a las 21:30 en la zona de la competición.",
        createdAt: "2026-11-01T10:00:00.000Z",
        responseDeadline: "2026-11-01T22:00:00.000Z",
      },
    ],
    decisions: [
      {
        id: "consent-1",
        proposalId: "proposal-2",
        requestVersion: 2,
        kind: "consent",
        responder: { authority: "rival_team", teamId: "team-home" },
        actorId: "captain-home",
        reason: null,
        createdAt: "2026-11-01T11:00:00.000Z",
      },
    ],
    actions: [
      {
        id: "expired-1",
        kind: "schedule_change_expired",
        actorId: "system-actor",
        authority: "system",
        proposalId: "proposal-2",
        fromVersion: 2,
        toVersion: 3,
        responseDeadline: "2026-11-01T22:00:00.000Z",
        processedAt: "2026-11-01T22:05:00.000Z",
        resolution: null,
      },
    ],
    allowedActions: ["resolve"],
    application: null,
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-01T22:05:00.000Z",
    ...overrides,
  };
}
