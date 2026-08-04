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
  competitions: {
    all: ["competitions"] as const,
    draft: (organizationId: string, competitionId: string) =>
      [...queryKeys.competitions.all, "draft", organizationId, competitionId] as const,
  },
  gameData: {
    all: ["game-data"] as const,
    clubSearch: (input: {
      readonly query: string;
      readonly platform: string;
      readonly providerKey?: string;
      readonly gameEdition?: string;
    }) => [...queryKeys.gameData.all, "clubs", "search", input] as const,
  },
} as const;
