/** Storybook stub — no Better Auth / network. */
export const authClient = {
  signIn: {
    email: async () => ({ data: { user: { id: "story-user" } }, error: null }),
  },
  signUp: {
    email: async () => ({ data: { user: { id: "story-user" } }, error: null }),
  },
};
