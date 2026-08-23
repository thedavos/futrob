// Session schema lockstep with apps/auth (ADR-0015). Serving and session
// reads live in apps/auth; web only uses this Drizzle schema to look up
// `identity_subjects` after AUTH_SERVICE get-session.
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
 * Request-scoped Better Auth instance bound to D1. Kept for tests and the
 * schema adapter; the live session path uses AUTH_SERVICE, not this helper.
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
    session: {
      disableSessionRefresh: true,
    },
    rateLimit: {
      enabled: false,
    },
    plugins: [bearer()],
  });
}

export type FutrobAuth = ReturnType<typeof createAuth>;
