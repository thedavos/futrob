import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import type { ActorProvisionerPort } from "@futrob/identity";
import type { IdGeneratorPort } from "@futrob/shared-kernel";
import type { D1Database } from "@cloudflare/workers-types";
import type { AuthEnv } from "../../auth-env.ts";
import { authSchema } from "./drizzle-schema.ts";
import { createD1ActorProvisioner, credentialSubject, type AuthDb } from "./actor-provisioner.ts";

export type { AuthEnv };

export function createAuthDb(d1: D1Database): AuthDb {
  return drizzle(d1, { schema: authSchema });
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
  readonly ids: IdGeneratorPort;
  readonly actorProvisioner?: ActorProvisionerPort;
}) {
  if (!input.env.BETTER_AUTH_SECRET) {
    throw new Error("auth: BETTER_AUTH_SECRET is required");
  }

  const db = createAuthDb(input.d1);
  const actorProvisioner =
    input.actorProvisioner ?? createD1ActorProvisioner({ db, ids: input.ids });

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
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await actorProvisioner.ensureActorForSubject(credentialSubject(user.id));
          },
        },
      },
    },
    // `bearer()` lets native clients (apps/mobile) present the session token
    // via `Authorization: Bearer <token>`; browsers keep using cookies.
    plugins: [bearer()],
  });
}

export type FutrobAuth = ReturnType<typeof createAuth>;
