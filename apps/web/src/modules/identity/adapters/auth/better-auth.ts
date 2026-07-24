import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzle } from "drizzle-orm/d1";
import type { ActorProvisionerPort } from "@futrob/identity";
import type { AppEnv } from "@/config/env.ts";
import type { IdGenerator } from "@/shared/application/id-generator.ts";
import type { AppD1Database } from "@/shared/infrastructure/d1.ts";
import { authSchema } from "./drizzle-schema.ts";
import { createD1ActorProvisioner, credentialSubject, type AuthDb } from "./actor-provisioner.ts";

export function createAuthDb(d1: AppD1Database): AuthDb {
  // drizzle-orm/d1 expects the Workers D1Database binding; AppD1Database is our local mirror.
  return drizzle(d1 as never, { schema: authSchema });
}

/**
 * Request-scoped Better Auth instance bound to D1.
 * Instantiate per request (or per handler) — do not share a singleton across isolates.
 */
export function createAuth(input: {
  readonly d1: AppD1Database;
  readonly env: Pick<
    AppEnv,
    "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL" | "BETTER_AUTH_TRUSTED_ORIGINS"
  >;
  readonly ids: IdGenerator;
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
    plugins: [tanstackStartCookies()],
  });
}

export type FutrobAuth = ReturnType<typeof createAuth>;
