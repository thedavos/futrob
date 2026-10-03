import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { CompetitionDraft } from "@futrob/competitions";
import type { OfficialResult } from "@futrob/results";
import type { TeamPerformanceContribution } from "@futrob/statistics";

export function performanceCompetition(): CompetitionDraft {
  const competitionId = asCompetitionId("competition-1");
  const date = new Date("2026-08-01T00:00:00Z");
  return {
    competition: {
      id: competitionId,
      organizationId: asOrganizationId("organization-1"),
      name: "Performance cup",
      status: "published",
      modality: "fc-clubs",
      gameEdition: "FC 26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 2, max: 8 },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdByActorId: asActorId("actor-1"),
      createdAt: date,
      updatedAt: date,
    },
    rules: {
      competitionId,
      version: 1,
      regularStage: {
        officialMatchesPerEncounter: 1,
        resolutionMode: "independent_matches",
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        allowRescheduling: false,
        maxReschedulesPerTeam: 0,
        minimumRescheduleNoticeHours: 0,
        rescheduleRequiresOpponentApproval: false,
        rescheduleRequiresOrganizerApproval: false,
      },
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: null,
      createdAt: date,
    },
  };
}

export function officialPerformanceResult(
  rows: readonly TeamPerformanceContribution[],
): OfficialResult {
  const first = rows[0]!;
  return {
    id: first.officialResultId,
    encounterId: first.encounterId,
    organizationId: first.organizationId,
    competitionId: first.competitionId,
    revision: first.revision,
    status: "approved",
    approvedAt: new Date("2026-08-30T00:00:00Z"),
    approvedBy: asActorId("actor-1"),
    slots: rows
      .filter((row) => row.side === "home")
      .map((row) => ({
        officialSlot: row.officialSlot,
        providerMatchRef: { providerKey: "ea-clubs", externalId: row.id },
        homeExternalClubId: "club-a",
        awayExternalClubId: "club-b",
        homeGoals: row.goalsFor,
        awayGoals: row.goalsAgainst,
        occurredAt: row.occurredAt,
        platform: row.platform,
        gameEdition: row.gameEdition,
        players: rows
          .filter((other) => other.officialSlot === row.officialSlot)
          .map((other) => ({
            externalPlayerId: other.side,
            displayName: other.side,
            externalClubId: other.externalClubId,
            position: null,
            minutesPlayed: 90,
            goals: other.goalsFor,
            assists: null,
            shots: other.shots,
            passAttempts: null,
            passesMade: null,
            tackleAttempts: null,
            tacklesMade: null,
            saves: null,
            yellowCards: null,
            redCards: null,
            isMvp: null,
            rating: null,
          })),
      })),
  };
}

export function performanceEntry(teamId: string) {
  return {
    id: `entry-${teamId}`,
    organizationId: asOrganizationId("organization-1"),
    competitionId: asCompetitionId("competition-1"),
    teamId: asTeamId(teamId),
    status: "approved" as const,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    creationKey: null,
  };
}
