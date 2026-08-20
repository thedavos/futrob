import type {
  GetMyMatchesQuery,
  GetMyRecentMatchPath,
  GetMyStatisticsQuery,
} from "@futrob/api-contracts";

export const queryKeys = {
  identity: {
    all: ["identity"] as const,
    onboardingStatus: () => [...queryKeys.identity.all, "onboarding-status"] as const,
  },
  players: {
    all: ["players"] as const,
    me: () => [...queryKeys.players.all, "me"] as const,
    meTeams: () => [...queryKeys.players.all, "me", "teams"] as const,
  },
  organizations: {
    all: ["organizations"] as const,
    mine: () => [...queryKeys.organizations.all, "mine"] as const,
  },
  authorization: {
    all: ["authorization"] as const,
    effectiveAccess: (
      scope: {
        readonly organizationId?: string;
        readonly competitionId?: string;
        readonly teamId?: string;
        readonly encounterId?: string;
      },
      permissions?: readonly string[],
    ) => [...queryKeys.authorization.all, "effective-access", scope, permissions] as const,
  },
  competitions: {
    all: ["competitions"] as const,
    mine: () => [...queryKeys.competitions.all, "mine"] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.competitions.all, "by-organization", organizationId] as const,
    draft: (organizationId: string, competitionId: string) =>
      [...queryKeys.competitions.all, "draft", organizationId, competitionId] as const,
    participants: (organizationId: string, competitionId: string) =>
      [...queryKeys.competitions.all, "participants", organizationId, competitionId] as const,
    teams: (organizationId: string) =>
      [...queryKeys.competitions.all, "teams", organizationId] as const,
  },
  teams: {
    all: ["teams"] as const,
    competitionManagement: (organizationId: string, competitionId: string) =>
      [...queryKeys.teams.all, "competition-management", organizationId, competitionId] as const,
    competitionManagementDetail: (organizationId: string, competitionId: string, teamId: string) =>
      [
        ...queryKeys.teams.competitionManagement(organizationId, competitionId),
        "detail",
        teamId,
      ] as const,
  },
  statistics: {
    all: ["statistics"] as const,
    me: (query: GetMyStatisticsQuery = {}) =>
      [...queryKeys.statistics.all, "me", "summary", query] as const,
    meMatches: (query: GetMyMatchesQuery) =>
      [...queryKeys.statistics.all, "me", "matches", query] as const,
  },
  gameData: {
    all: ["game-data"] as const,
    clubSearch: (input: {
      readonly query: string;
      readonly platform: string;
      readonly providerKey?: string;
      readonly gameEdition?: string;
    }) => [...queryKeys.gameData.all, "clubs", "search", input] as const,
    meRecentMatches: (externalClubId?: string) =>
      externalClubId
        ? ([...queryKeys.gameData.all, "me", "recent-matches", externalClubId] as const)
        : ([...queryKeys.gameData.all, "me", "recent-matches"] as const),
    meRecentMatch: (
      input: GetMyRecentMatchPath & {
        readonly externalClubId?: string;
      },
    ) => [...queryKeys.gameData.meRecentMatches(), "detail", input] as const,
    club: (input: {
      readonly externalClubId: string;
      readonly platform: string;
      readonly providerKey?: string;
      readonly gameEdition?: string;
    }) => [...queryKeys.gameData.all, "clubs", "retrieve", input] as const,
  },
} as const;
