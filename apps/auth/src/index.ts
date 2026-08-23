import type { IdGeneratorPort } from "@futrob/shared-kernel";
import { createAuth } from "./adapters/auth/better-auth.ts";
import { buildAuthEnv, type AuthEnv, type AuthWorkerEnv } from "./auth-env.ts";
import { isAuthSchemaReady } from "./auth-readiness.ts";
import { SystemClock } from "./clock.ts";
import { CryptoIdGenerator } from "./id-generator.ts";

/**
 * futrob-auth — standalone Better Auth Worker (ADR-0015).
 *
 * Serves `/api/auth/*` (email/password + bearer sessions) against the shared D1
 * (`futrob-app`). Web proxies this origin same-origin and asks this worker for
 * `get-session`; it does not read Better Auth session tables itself.
 */

export type { AuthWorkerEnv };

function misconfigured() {
  return Response.json(
    { code: "auth.misconfigured", messageKey: "errors.auth.misconfigured" },
    { status: 503 },
  );
}

async function health(env: AuthWorkerEnv): Promise<Response> {
  try {
    if (!env.APP_DB) {
      throw new Error("APP_DB is required");
    }
    buildAuthEnv(env);
    if (!(await isAuthSchemaReady(env.APP_DB))) {
      throw new Error("Auth schema is incomplete");
    }
    return Response.json({ ok: true, service: "futrob-auth" });
  } catch {
    return Response.json({ ok: false, service: "futrob-auth" }, { status: 503 });
  }
}

export default {
  async fetch(request: Request, env: AuthWorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/meta/health") {
      return await health(env);
    }

    if (url.pathname !== "/api/auth" && !url.pathname.startsWith("/api/auth/")) {
      return new Response(null, { status: 404 });
    }

    if (!env.APP_DB) {
      return misconfigured();
    }

    let authEnv: AuthEnv;
    try {
      authEnv = buildAuthEnv(env);
    } catch {
      return misconfigured();
    }

    try {
      const clock = new SystemClock();
      const ids: IdGeneratorPort = new CryptoIdGenerator();
      const auth = createAuth({
        d1: env.APP_DB,
        env: authEnv,
        clock,
        ids,
      });
      return await auth.handler(request);
    } catch {
      console.error(JSON.stringify({ event: "auth.request.failed" }));
      return Response.json(
        { code: "auth.unhandled", messageKey: "errors.auth.unhandled" },
        { status: 500 },
      );
    }
  },
} satisfies ExportedHandler<AuthWorkerEnv>;
