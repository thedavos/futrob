import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import type { ActorProvisionerPort } from "@futrob/identity";
import type { ClockPort, IdGeneratorPort } from "@futrob/shared-kernel";
import type { D1Database } from "@cloudflare/workers-types";
import type { AuthEnv } from "../../auth-env.ts";
import { authSchema } from "./drizzle-schema.ts";
import { createD1ActorProvisioner, credentialSubject, type AuthDb } from "./actor-provisioner.ts";

export type { AuthEnv };

export function createAuthDb(d1: D1Database): AuthDb {
  return drizzle(d1, { schema: authSchema });
}

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
 * Request-scoped Better Auth instance bound to D1.
 * Instantiate per request (or per handler) — do not share a singleton across isolates.
 *
 * This worker serves plain fetch requests, so only `bearer()` is enabled.
 * Cookies are set/read by Better Auth core on the Request/Response.
 */
export function createAuth(input: {
  readonly d1: D1Database;
  readonly env: AuthEnv;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
  readonly actorProvisioner?: ActorProvisionerPort;
}) {
  if (input.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error("auth: BETTER_AUTH_SECRET must contain at least 32 characters");
  }

  const db = createAuthDb(input.d1);
  const actorProvisioner =
    input.actorProvisioner ??
    createD1ActorProvisioner({ db, clock: input.clock, ids: input.ids });

  return betterAuth({
    appName: "Futrob",
    baseURL: input.env.BETTER_AUTH_URL,
    secret: input.env.BETTER_AUTH_SECRET,
    trustedOrigins: [...input.env.BETTER_AUTH_TRUSTED_ORIGINS],
    database: drizzleAdapter(db, {
      provider: "sqlite",
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
    // Provision before a session is issued. If D1 fails, sign-in can be retried
    // and repairs an existing Better Auth user instead of stranding it.
    databaseHooks: createActorProvisioningHooks(actorProvisioner),
    // `bearer()` lets native clients (apps/mobile) present the session token
    // via `Authorization: Bearer <token>`; browsers keep using cookies.
    plugins: [bearer()],
  });
}

export type FutrobAuth = ReturnType<typeof createAuth>;
