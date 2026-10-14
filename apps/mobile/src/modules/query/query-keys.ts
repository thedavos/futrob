export const mobileQueryKeys = {
  sessionGate: () => ["session-gate"] as const,
  onboardingFlow: (step: string) => ["onboarding-flow", step] as const,
  playerHome: (externalClubId: string | undefined) => ["player-home", externalClubId] as const,
  playerProfile: () => ["player-profile"] as const,
  destination: (destination: {
    readonly kind: string;
    readonly organizationId?: string;
    readonly competitionId?: string;
  }) =>
    [
      "native-destination",
      destination.kind,
      destination.organizationId,
      destination.competitionId,
    ] as const,
} as const;
