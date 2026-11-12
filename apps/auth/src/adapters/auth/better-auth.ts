import { betterAuth, type BetterAuthOptions } from "better-auth";
import { isAPIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, customSession } from "better-auth/plugins";
import type { ActorProvisionerPort } from "@futrob/identity";
import type { ClockPort, IdGeneratorPort } from "@futrob/shared-kernel";
import type { AuthEnv } from "../../auth-env.ts";
import { authSchema } from "./drizzle-schema.ts";
import type { AuthDb } from "./database.ts";
import {
  createPostgresActorProvisioner,
  credentialSubject,
  findActorIdForSubject,
} from "./actor-provisioner.ts";
import { syncCredentialUserContact } from "./actor-contact-profile.ts";
import type { AuthMailPort } from "../mail/auth-mail.port.ts";
import { LogAuthMail } from "../mail/log-auth-mail.ts";
import { ResendAuthMail } from "../mail/resend-auth-mail.ts";
import {
  countOpenPasswordResets,
  deletePasswordResets,
  PASSWORD_RESET_TTL_SECONDS,
  PASSWORD_RESETS_PER_ACCOUNT,
} from "./password-reset.ts";
import {
  EMAIL_VERIFICATION_TTL_SECONDS,
  isEmailChangeToken,
  isResendRequest,
  rejectUsedVerificationLink,
  withVerificationCallback,
} from "./email-verification.ts";

export type { AuthEnv };

/**
 * Where a reset link lands after the auth worker checks its token: the web page, or the
 * native app through its `futrob://` scheme. Clients pass one of these as `redirectTo`.
 */
export const PASSWORD_RESET_WEB_CALLBACK = "/reset-password";
export const PASSWORD_RESET_APP_CALLBACK = "futrob://reset-password";

function createMail(env: AuthEnv): AuthMailPort | undefined {
  switch (env.AUTH_EMAIL?.delivery) {
    case "log":
      return new LogAuthMail();
    case "resend":
      return new ResendAuthMail({ apiKey: env.AUTH_EMAIL.apiKey, from: env.AUTH_EMAIL.from });
    case "disabled":
    case undefined:
      return undefined;
  }
}

export interface ActorContactSync {
  syncCredentialUser(userId: string): Promise<void>;
}

export function createActorProvisioningHooks(
  actorProvisioner: ActorProvisionerPort,
  contacts?: ActorContactSync,
) {
  return {
    session: {
      create: {
        before: async (session: { readonly userId: string }) => {
          await actorProvisioner.ensureActorForSubject(credentialSubject(session.userId));
          await contacts?.syncCredentialUser(session.userId);
        },
      },
    },
    user: {
      update: {
        after: async (user: { readonly id: string }) => {
          await contacts?.syncCredentialUser(user.id);
        },
      },
    },
  };
}

/**
 * Better Auth turns endpoint exceptions into HTTP responses without rethrowing,
 * so the worker's outer catch never sees them. Report only defects: 4xx
 * `APIError`s (bad credentials, rate limits) are expected responses.
 */
export function createAuthErrorHandler(
  reportDefect: (cause: Error) => void,
): NonNullable<BetterAuthOptions["onAPIError"]> {
  return {
    onError: (error) => {
      if (isAPIError(error) && error.statusCode < 500) return;
      reportDefect(error instanceof Error ? error : new Error("auth.endpoint.failed"));
    },
  };
}

/**
 * Request-scoped Better Auth instance bound to the product Postgres (ADR-0021).
 * Instantiate per request (or per handler) — do not share a singleton across isolates.
 *
 * This worker serves plain fetch requests, so only `bearer()` is enabled.
 * Cookies are set/read by Better Auth core on the Request/Response.
 *
 * `get-session` also returns the resolved `actorId` so web/BFF never query
 * identity tables; `null` means the user has no provisioned actor yet.
 */
export function createAuth(input: {
  readonly db: AuthDb;
  readonly env: AuthEnv;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
  readonly actorProvisioner?: ActorProvisionerPort;
  /** Overrides the adapter chosen by `AUTH_EMAIL_DELIVERY`; tests capture links with it. */
  readonly mail?: AuthMailPort;
  /**
   * Runs account email after the response (the Worker's `waitUntil`), so asking for a reset
   * link takes as long whether or not the account exists. Omitted: email is awaited.
   */
  readonly runInBackground?: (task: Promise<unknown>) => void;
  readonly reportDefect: (cause: Error) => void;
}) {
  if (input.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error("auth: BETTER_AUTH_SECRET must contain at least 32 characters");
  }

  const actorProvisioner =
    input.actorProvisioner ??
    createPostgresActorProvisioner({ db: input.db, clock: input.clock, ids: input.ids });

  const mail = input.mail ?? createMail(input.env);
  // Set once the instance exists; only a failed verification resend asks it.
  let isSignedIn = async (_headers: Headers): Promise<boolean> => false;

  const auth = betterAuth({
    appName: "Futrob",
    baseURL: input.env.BETTER_AUTH_URL,
    secret: input.env.BETTER_AUTH_SECRET,
    trustedOrigins: [...input.env.BETTER_AUTH_TRUSTED_ORIGINS, PASSWORD_RESET_APP_CALLBACK],
    database: drizzleAdapter(input.db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      // The answer to a reset request is the same whether or not the account exists; the
      // link is single use, expires, and the new password ends every session (AUTH-01).
      // Without a mail adapter the endpoint answers RESET_PASSWORD_DISABLED for every email.
      sendResetPassword: mail
        ? async ({ user, url }) => {
            try {
              const open = await countOpenPasswordResets(input.db, user.id, input.clock.now());
              if (open > PASSWORD_RESETS_PER_ACCOUNT) return;
              await mail.sendPasswordReset({ to: user.email, name: user.name, url });
            } catch (cause) {
              input.reportDefect(cause instanceof Error ? cause : new Error("auth.mail.failed"));
            }
          }
        : undefined,
      resetPasswordTokenExpiresIn: PASSWORD_RESET_TTL_SECONDS,
      revokeSessionsOnPasswordReset: true,
      onPasswordReset: async ({ user }) => {
        await deletePasswordResets(input.db, user.id);
      },
    },
    // Changing email sends a link to the new address; the old one stays valid until it is
    // opened. Without a mail adapter the endpoint answers CHANGE_EMAIL_DISABLED.
    user: { changeEmail: { enabled: mail !== undefined } },
    // AUTH-02: a new account gets a verification link, but signing in never waits for it.
    // The same callback carries email change links; their token names the new address.
    emailVerification: mail
      ? {
          sendOnSignUp: true,
          expiresIn: EMAIL_VERIFICATION_TTL_SECONDS,
          sendVerificationEmail: async ({ user, url, token }, request) => {
            if (isEmailChangeToken(token)) {
              await mail.sendEmailChangeVerification({ to: user.email, name: user.name, url });
              return;
            }
            // A failed send must not fail sign-up; the account can ask for another link. A
            // signed-in resend fails visibly so it can retry; an anonymous one answers as if it
            // sent, so the reply never tells which accounts exist.
            try {
              await mail.sendEmailVerification({
                to: user.email,
                name: user.name,
                url: withVerificationCallback(url),
              });
            } catch (cause) {
              if (isResendRequest(request) && (await isSignedIn(request.headers))) {
                throw cause;
              }
              input.reportDefect(cause instanceof Error ? cause : new Error("auth.mail.failed"));
            }
          },
        }
      : undefined,
    hooks: { before: rejectUsedVerificationLink },
    onAPIError: createAuthErrorHandler(input.reportDefect),
    rateLimit: {
      enabled: true,
      storage: "database",
      // Per IP; the per-account reset cap lives in `sendResetPassword`.
      customRules: {
        "/request-password-reset": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
      },
    },
    advanced: {
      backgroundTasks: input.runInBackground ? { handler: input.runInBackground } : undefined,
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
    // Provision before a session is issued. If the database fails, sign-in can be
    // retried and repairs an existing Better Auth user instead of stranding it.
    databaseHooks: createActorProvisioningHooks(actorProvisioner, {
      syncCredentialUser: (userId) => syncCredentialUserContact(input.db, userId),
    }),
    plugins: [
      // `bearer()` lets native clients (apps/mobile) present the session token
      // via `Authorization: Bearer <token>`; browsers keep using cookies.
      bearer(),
      customSession(async ({ user, session }) => ({
        user,
        session,
        actorId: await findActorIdForSubject(input.db, credentialSubject(user.id)),
      })),
    ],
  });
  isSignedIn = async (headers) => (await auth.api.getSession({ headers })) !== null;
  return auth;
}

export type FutrobAuth = ReturnType<typeof createAuth>;
