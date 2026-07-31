export class OrganizationsClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

/** Storybook stub — organization operations without API. */
export const organizationsBrowserClient = {
  create: async () => ({
    organizationId: "org-story",
    name: "Liga Story",
    role: "organizer" as const,
  }),
  acceptInvitation: async () => ({
    organizationId: "org-story",
    organizationName: "Liga Story",
    role: "player" as const,
    competitionId: "competition-story",
    competitionName: "Copa Story",
    destination: {
      kind: "competition" as const,
      organizationId: "org-story",
      competitionId: "competition-story",
    },
  }),
  resolvePostAuthDestination: async () => ({
    destination: { kind: "onboarding" as const },
  }),
};
