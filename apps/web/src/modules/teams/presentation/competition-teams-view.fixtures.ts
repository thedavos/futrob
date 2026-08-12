import type {
  CompetitionTeamManagementDetailResponse,
  CompetitionTeamManagementSummaryDto,
} from "@futrob/api-contracts";

const createdAt = "2026-08-11T00:00:00.000Z";

export function teamManagementFixture(
  overrides: Partial<CompetitionTeamManagementDetailResponse["roster"]> = {},
): CompetitionTeamManagementDetailResponse {
  return {
    team: { id: "team-1", organizationId: "org-1", name: "Cuervos FC", createdAt },
    entry: {
      id: "entry-1",
      organizationId: "org-1",
      competitionId: "competition-1",
      teamId: "team-1",
      status: "pending",
      createdAt,
    },
    roster: { state: "open", memberCount: 2, maxSize: 11, lockedAt: null, ...overrides },
    externalClub: {
      teamId: "team-1",
      providerKey: "ea-clubs",
      externalClubId: "club-1",
      externalClubName: "Cuervos EA",
      platform: "common-gen5",
      gameEdition: "FC 26",
    },
    members: [
      {
        membership: {
          id: "member-1",
          organizationId: "org-1",
          competitionId: "competition-1",
          teamId: "team-1",
          playerProfileId: "player-1",
          gameAccountId: "account-1",
          role: "captain",
          createdAt,
        },
        presentation: { displayName: "Dani Capitán", avatarUrl: null },
      },
      {
        membership: {
          id: "member-2",
          organizationId: "org-1",
          competitionId: "competition-1",
          teamId: "team-1",
          playerProfileId: "player-2",
          gameAccountId: null,
          role: "player",
          createdAt,
        },
        presentation: { displayName: "Vale Nueve", avatarUrl: null },
      },
    ],
  };
}

export function teamSummaryFixture(
  detail = teamManagementFixture(),
): CompetitionTeamManagementSummaryDto {
  const { members: _members, ...summary } = detail;
  return summary;
}
