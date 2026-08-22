import type { IdGeneratorPort } from "@futrob/shared-kernel";
import { createAuth, type AuthEnv } from "./adapters/auth/better-auth.ts";
import { CryptoIdGenerator } from "./id-generator.ts";

/**
 * futrob-auth — standalone Better Auth Worker (ADR-0015).
 *
 * Serves `/api/auth/*` (email/password + bearer sessions) against the same D1
 * database as apps/web. Stage 1: parallel run — web keeps its embedded auth
 * while clients migrate to this origin.
 */

export interface AuthWorkerEnv {
  readonly APP_DB?: D1Database;
  readonly APP_BASE_URL?: string;
  readonly BETTER_AUTH_SECRET?: string;
  readonly BETTER_AUTH_URL?: string;
  readonly BETTER_AUTH_TRUSTED_ORIGINS?: string;
}

const DEFAULT_TRUSTED_ORIGINS = "http://localhost:3000,http://localhost:8788";

function parseTrustedOrigins(raw: string | undefined): readonly string[] {
  return (raw ?? DEFAULT_TRUSTED_ORIGINS)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildAuthEnv(env: AuthWorkerEnv, requestOrigin: string): AuthEnv {
  return {
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET ?? "",
    // Default to the worker origin so local dev works without extra vars.
    BETTER_AUTH_URL: env.BETTER_AUTH_URL ?? requestOrigin,
    BETTER_AUTH_TRUSTED_ORIGINS: parseTrustedOrigins(
      env.BETTER_AUTH_TRUSTED_ORIGINS ?? `${requestOrigin},${DEFAULT_TRUSTED_ORIGINS}`,
    ),
  };
}

function misconfigured() {
  return Response.json(
    { code: "auth.misconfigured", messageKey: "errors.auth.misconfigured" },
    { status: 503 },
  );
}

export default {
  async fetch(request: Request, env: AuthWorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/meta/health") {
      return Response.json({ ok: true, service: "futrob-auth", db: env.APP_DB ? "ok" : "missing" });
    }

    if (!url.pathname.startsWith("/api/auth/")) {
      return new Response(null, { status: 404 });
    }

    if (!env.APP_DB) {
      return misconfigured();
    }

    try {
      const ids: IdGeneratorPort = new CryptoIdGenerator();
      const auth = createAuth({
        d1: env.APP_DB,
        env: buildAuthEnv(env, url.origin),
        ids,
      });
      return await auth.handler(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "auth failed";
      if (message.includes("BETTER_AUTH_SECRET")) {
        return misconfigured();
      }
      console.error(`[auth] unhandled: ${message}`);
      return Response.json(
        { code: "auth.unhandled", messageKey: "errors.auth.unhandled" },
        { status: 500 },
      );
    }
  },
} satisfies ExportedHandler<AuthWorkerEnv>;
