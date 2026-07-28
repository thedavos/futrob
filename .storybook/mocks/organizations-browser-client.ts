/** Storybook stub — post-auth destination without API. */
export const organizationsBrowserClient = {
  resolvePostAuthDestination: async () => ({
    destination: { kind: "onboarding" as const },
  }),
};
