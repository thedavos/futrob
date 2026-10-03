import type { IdGeneratorPort } from "@futrob/shared-kernel";
import { connectAuthDatabase } from "./adapters/auth/database.ts";
import { createAuth } from "./adapters/auth/better-auth.ts";
import { buildAuthEnv, type AuthEnv, type AuthWorkerEnv } from "./auth-env.ts";
import { isAuthSchemaReady } from "./auth-readiness.ts";
import { SystemClock } from "./clock.ts";
import { CryptoIdGenerator } from "./id-generator.ts";

/**
 * futrob-auth — standalone Better Auth Worker (ADR-0015).
 *
 * Serves `/api/auth/*` (email/password + bearer sessions) against the product
 * Postgres through Hyperdrive (ADR-0021). Web proxies this origin same-origin and
 * asks this worker for `get-session`, which already carries the resolved `actorId`;
 * it does not read Better Auth or identity tables itself.
 */

export type { AuthWorkerEnv };

function misconfigured() {
  return Response.json(
    { code: "auth.misconfigured", messageKey: "errors.auth.misconfigured" },
    { status: 503 },
  );
}

async function health(env: AuthWorkerEnv): Promise<Response> {
  let connection: Awaited<ReturnType<typeof connectAuthDatabase>> | undefined;
  try {
    if (!env.HYPERDRIVE) {
      throw new Error("HYPERDRIVE is required");
    }
    buildAuthEnv(env);
    connection = await connectAuthDatabase(env.HYPERDRIVE.connectionString);
    if (!(await isAuthSchemaReady(connection.client))) {
      throw new Error("Auth schema is incomplete");
    }
    return Response.json({ ok: true, service: "futrob-auth" });
  } catch {
    return Response.json({ ok: false, service: "futrob-auth" }, { status: 503 });
  } finally {
    await connection?.close();
  }
}

export default {
  async fetch(request: Request, env: AuthWorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/meta/health") {
      return await health(env);
    }

    if (url.pathname !== "/api/auth" && !url.pathname.startsWith("/api/auth/")) {
      return new Response(null, { status: 404 });
    }

    if (!env.HYPERDRIVE) {
      return misconfigured();
    }

    let authEnv: AuthEnv;
    try {
      authEnv = buildAuthEnv(env);
    } catch {
      return misconfigured();
    }

    let connection: Awaited<ReturnType<typeof connectAuthDatabase>> | undefined;
    try {
      connection = await connectAuthDatabase(env.HYPERDRIVE.connectionString);
      const clock = new SystemClock();
      const ids: IdGeneratorPort = new CryptoIdGenerator();
      const auth = createAuth({ db: connection.db, env: authEnv, clock, ids });
      return await auth.handler(request);
    } catch {
      console.error(JSON.stringify({ event: "auth.request.failed" }));
      return Response.json(
        { code: "auth.unhandled", messageKey: "errors.auth.unhandled" },
        { status: 500 },
      );
    } finally {
      if (connection) {
        ctx.waitUntil(connection.close());
      }
    }
  },
} satisfies ExportedHandler<AuthWorkerEnv>;
