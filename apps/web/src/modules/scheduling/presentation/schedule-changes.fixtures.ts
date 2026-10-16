import type {
  ScheduleChangeCreationOptionsDto,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";

/** What a reader who speaks for no Team of the Encounter sees. */
export const noCreation: ScheduleChangeCreationOptionsDto = {
  blockedReason: "permission",
  teams: [],
  scopes: [],
};

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
    respondAs: null,
    blockedActions: [
      { action: "accept", reason: "request_closed" },
      { action: "reject", reason: "request_closed" },
      { action: "counter", reason: "request_closed" },
    ],
    application: null,
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-01T22:05:00.000Z",
    ...overrides,
  };
}

/** A captain of the home Team on a two-slot Encounter with every scope free. */
export function captainCreation(
  overrides: Partial<ScheduleChangeCreationOptionsDto> = {},
): ScheduleChangeCreationOptionsDto {
  return {
    blockedReason: null,
    teams: [{ teamId: "team-home", blockedReason: null }],
    scopes: [
      {
        scope: { type: "entire_encounter" },
        currentStartAt: "2026-09-15T01:00:00.000Z",
        blockedReason: null,
      },
      {
        scope: { type: "official_match", officialSlot: 1 },
        currentStartAt: "2026-09-15T01:00:00.000Z",
        blockedReason: null,
      },
      {
        scope: { type: "official_match", officialSlot: 2 },
        currentStartAt: "2026-09-17T01:30:00.000Z",
        blockedReason: null,
      },
    ],
    ...overrides,
  };
}

/** The home captain's open proposal, as its rival (the away captain) reads it. */
export function openScheduleChange(
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
    status: "open",
    version: 1,
    currentProposalId: "proposal-1",
    proposals: [
      {
        id: "proposal-1",
        proposedStartAt: "2026-10-11T20:00:00.000Z",
        proposedByActorId: "captain-home",
        proposedByTeamId: "team-home",
        reason: "Dos titulares viajan el día del partido.",
        createdAt: "2026-09-01T15:00:00.000Z",
        responseDeadline: "2026-09-03T15:00:00.000Z",
      },
    ],
    decisions: [],
    actions: [],
    allowedActions: ["accept", "reject", "counter"],
    respondAs: { authority: "rival_team", teamId: "team-away" },
    blockedActions: [],
    application: null,
    createdAt: "2026-09-01T15:00:00.000Z",
    updatedAt: "2026-09-01T15:00:00.000Z",
    ...overrides,
  };
}
