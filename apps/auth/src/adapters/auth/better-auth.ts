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

export type { AuthEnv };

export function createActorProvisioningHooks(actorProvisioner: ActorProvisionerPort) {
  return {
    session: {
      create: {
        before: async (session: { readonly userId: string }) => {
          await actorProvisioner.ensureActorForSubject(credentialSubject(session.userId));
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
}) {
  if (input.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error("auth: BETTER_AUTH_SECRET must contain at least 32 characters");
  }

  const actorProvisioner =
    input.actorProvisioner ??
    createPostgresActorProvisioner({ db: input.db, clock: input.clock, ids: input.ids });

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
    databaseHooks: createActorProvisioningHooks(actorProvisioner),
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
