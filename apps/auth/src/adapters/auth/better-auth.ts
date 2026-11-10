import { betterAuth } from "better-auth";
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

export type { AuthEnv };

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
}) {
  if (input.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error("auth: BETTER_AUTH_SECRET must contain at least 32 characters");
  }

  const actorProvisioner =
    input.actorProvisioner ??
    createPostgresActorProvisioner({ db: input.db, clock: input.clock, ids: input.ids });

  const mail =
    input.mail ?? (input.env.AUTH_EMAIL_DELIVERY === "log" ? new LogAuthMail() : undefined);

  return betterAuth({
    appName: "Futrob",
    baseURL: input.env.BETTER_AUTH_URL,
    secret: input.env.BETTER_AUTH_SECRET,
    trustedOrigins: [...input.env.BETTER_AUTH_TRUSTED_ORIGINS],
    database: drizzleAdapter(input.db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    // Changing email sends a link to the new address; the old one stays valid until it is
    // opened. Without a mail adapter the endpoint answers CHANGE_EMAIL_DISABLED.
    user: { changeEmail: { enabled: mail !== undefined } },
    emailVerification: mail
      ? {
          sendVerificationEmail: async ({ user, url }) => {
            await mail.sendEmailChangeVerification({ to: user.email, name: user.name, url });
          },
        }
      : undefined,
    rateLimit: {
      enabled: true,
      storage: "database",
    },
    advanced: {
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
}

export type FutrobAuth = ReturnType<typeof createAuth>;
