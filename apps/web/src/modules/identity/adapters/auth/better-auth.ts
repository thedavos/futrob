// Session read-model (ADR-0015 stage 3): serving lives in apps/auth. Web only
// instantiates Better Auth to call `auth.api.getSession` against D1.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import type { AppEnv } from "@/config/env.ts";
import type { AppD1Database } from "@/shared/infrastructure/d1.ts";
import { authSchema } from "./drizzle-schema.ts";
import type { AuthDb } from "./actor-provisioner.ts";

export function createAuthDb(d1: AppD1Database): AuthDb {
  return drizzle(d1, { schema: authSchema });
}

/**
 * Request-scoped Better Auth instance bound to D1 for session reads.
 * Instantiate per request. Do not enable sign-up, hooks, or cookie serving here.
 */
export function createAuth(input: {
  readonly d1: AppD1Database;
  readonly env: Pick<
    AppEnv,
    "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL" | "BETTER_AUTH_TRUSTED_ORIGINS"
  >;
}) {
  if (!input.env.BETTER_AUTH_SECRET) {
    throw new Error("auth: BETTER_AUTH_SECRET is required");
  }

  const db = createAuthDb(input.d1);

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
      enabled: false,
    },
    rateLimit: {
      enabled: false,
    },
    plugins: [bearer()],
  });
}

export type FutrobAuth = ReturnType<typeof createAuth>;
