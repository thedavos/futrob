import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type {
  TeamPerformanceContribution,
  TeamPerformanceSources,
} from "../entities/team-performance-ranking-snapshot.ts";

export const performanceScope = {
  competitionId: asCompetitionId("competition-1"),
  organizationId: asOrganizationId("organization-1"),
};
export const performanceHome = asTeamId("team-a");
export const performanceAway = asTeamId("team-b");

export function performanceMatch(
  index: number,
  input: Partial<TeamPerformanceContribution> = {},
): TeamPerformanceContribution {
  return {
    ...performanceScope,
    id: `contribution-${index}-home`,
    officialResultId: `result-${index}`,
    revision: 1,
    encounterId: asEncounterId(`encounter-${index}`),
    officialSlot: 1,
    resolutionMode: "independent_matches",
    teamId: performanceHome,
    correlationStatus: "matched",
    side: "home",
    externalClubId: "club-a",
    goalsFor: 2,
    goalsAgainst: 0,
    platform: "playstation",
    gameEdition: "fc26",
    minutesPlayed: 90,
    goals: 2,
    assists: 1,
    shots: 4,
    passAttempts: null,
    passesMade: null,
    tackleAttempts: null,
    tacklesMade: null,
    saves: null,
    yellowCards: null,
    redCards: null,
    isMvp: null,
    rating: null,
    occurredAt: new Date(`2026-08-${String(index).padStart(2, "0")}T19:00:00.000Z`),
    ...input,
  };
}

export function performancePair(
  index: number,
  input: Partial<TeamPerformanceContribution> = {},
  opponent: Partial<TeamPerformanceContribution> = {},
): TeamPerformanceContribution[] {
  const home = performanceMatch(index, input);
  return [
    home,
    {
      ...home,
      id: `${home.id}-away`,
      teamId: performanceAway,
      externalClubId: "club-b",
      side: "away",
      goalsFor: home.goalsAgainst,
      goalsAgainst: home.goalsFor,
      ...opponent,
    },
  ];
}

export function performanceSources(
  contributions = [1, 2, 3].flatMap((index) => performancePair(index)),
): TeamPerformanceSources {
  return {
    ...performanceScope,
    teamIds: [performanceHome, performanceAway],
    contributions,
    revisions: [1, 2, 3].map((index) => ({
      officialResultId: `result-${index}`,
      encounterId: `encounter-${index}`,
      revision: 1,
      status: "approved",
    })),
    revisionFingerprint: "a".repeat(64),
    projectionComplete: true,
    unmatchedContributions: 0,
  };
}
