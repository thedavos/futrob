/** Storybook stub — no Better Auth / network. */

const EXISTING_EMAIL = "ya-existe@ejemplo.com";
const BAD_LOGIN_EMAIL = "malo@ejemplo.com";

type EmailPayload = {
  email?: string;
  password?: string;
  name?: string;
};

function readEmail(payload: EmailPayload | string | undefined): string {
  if (typeof payload === "string") {
    return payload;
  }

  return payload?.email?.trim() ?? "";
}

export const authClient = {
  signIn: {
    email: async (payload?: EmailPayload | string) => {
      if (readEmail(payload) === BAD_LOGIN_EMAIL) {
        return {
          data: null,
          error: { status: 401, code: "INVALID_EMAIL_OR_PASSWORD" },
        };
      }

      return { data: { user: { id: "story-user" } }, error: null };
    },
  },
  signUp: {
    email: async (payload?: EmailPayload | string) => {
      if (readEmail(payload) === EXISTING_EMAIL) {
        return {
          data: null,
          error: { status: 422, code: "USER_ALREADY_EXISTS" },
        };
      }

      return { data: { user: { id: "story-user" } }, error: null };
    },
  },
};
