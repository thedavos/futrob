import type { CompetitionDraft } from "@futrob/competitions";
import { asFixtureRoundId, asFixtureStageId, type FixturePlan } from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
export const org = asOrganizationId("expiry-org");
export const competition = asCompetitionId("expiry-competition");
export const encounter = asEncounterId("expiry-encounter");
export const teamA = asTeamId("expiry-a");
export const teamB = asTeamId("expiry-b");
export const captainA = asActorId("expiry-captain-a");
export const captainB = asActorId("expiry-captain-b");
export const organizer = asActorId("expiry-organizer");
export const system = asActorId("expiry-system");
export const P = "2026-11-01T08:00:00.000Z";
export const K = "2026-11-01T18:00:00.000Z";
export const S1 = "2026-11-02T20:00:00.000Z";
export const D = "2026-11-01T20:00:00.000Z";
export const SLOT2 = "2026-11-01T19:00:00.000Z";
export const scope = { organizationId: org, competitionId: competition, encounterId: encounter };

export function competitionDraft(hours: number, organizerRequired: boolean): CompetitionDraft {
  const at = new Date(P);
  return {
    competition: {
      id: competition,
      organizationId: org,
      name: "Expiry cup",
      status: "published",
      modality: "fc-clubs",
      gameEdition: "FC26",
      platform: "pc",
      region: "south-america",
      timeZone: "UTC",
      format: "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdByActorId: organizer,
      createdAt: at,
      updatedAt: at,
    },
    rules: {
      competitionId: competition,
      version: 1,
      regularStage: {
        officialMatchesPerEncounter: 2,
        resolutionMode: "independent_matches",
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        allowRescheduling: true,
        maxReschedulesPerTeam: 2,
        minimumRescheduleNoticeHours: 0,
        rescheduleProposalExpiryHours: hours,
        rescheduleRequiresOpponentApproval: true,
        rescheduleRequiresOrganizerApproval: organizerRequired,
      },
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: null,
      createdAt: at,
    },
  };
}
export function fixturePlan(): FixturePlan {
  const stageId = asFixtureStageId("expiry-stage");
  const roundId = asFixtureRoundId("expiry-round");
  return {
    id: "expiry-plan",
    revision: 1,
    status: "active",
    generationKey: "expiry-generation",
    generationFingerprint: "expiry-fingerprint",
    organizationId: org,
    competitionId: competition,
    rulesVersion: 1,
    generationVersion: 1,
    format: "league",
    timeZone: "UTC",
    homeAndAway: false,
    seed: [teamA, teamB],
    stages: [
      {
        id: stageId,
        kind: "league",
        order: 1,
        rounds: [
          {
            id: roundId,
            stageId,
            number: 1,
            scheduledStartAt: new Date(K),
            encounters: [
              {
                id: encounter,
                stageId,
                roundId,
                order: 1,
                home: { kind: "team", teamId: teamA },
                away: { kind: "team", teamId: teamB },
                scheduledStartAt: new Date(K),
                officialMatchCount: 2,
                series: null,
              },
            ],
          },
        ],
      },
    ],
  };
}
