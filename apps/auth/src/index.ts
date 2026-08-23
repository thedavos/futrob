import type { IdGeneratorPort } from "@futrob/shared-kernel";
import { createAuth } from "./adapters/auth/better-auth.ts";
import { buildAuthEnv, type AuthWorkerEnv } from "./auth-env.ts";
import { CryptoIdGenerator } from "./id-generator.ts";

/**
 * futrob-auth — standalone Better Auth Worker (ADR-0015).
 *
 * Serves `/api/auth/*` (email/password + bearer sessions) against the same D1
 * database as apps/web. Web proxies this origin same-origin and only reads sessions.
 */

export type { AuthWorkerEnv };

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

    if (url.pathname !== "/api/auth" && !url.pathname.startsWith("/api/auth/")) {
      return new Response(null, { status: 404 });
    }

    if (!env.APP_DB) {
      return misconfigured();
    }

    if (!env.BETTER_AUTH_SECRET?.trim()) {
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
      console.error(`[auth] unhandled: ${message}`);
      return Response.json(
        { code: "auth.unhandled", messageKey: "errors.auth.unhandled" },
        { status: 500 },
      );
    }
  },
} satisfies ExportedHandler<AuthWorkerEnv>;
