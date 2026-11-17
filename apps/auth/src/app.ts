import type { HttpBindings } from "@hono/node-server";
import { Hono } from "hono";
import { resolveClientIp, withClientIp, type ClientIpPolicy } from "./client-ip.ts";

export interface AuthAppDeps {
  /** Better Auth's fetch handler. */
  readonly handleAuth: (request: Request) => Promise<Response>;
  /** True when Postgres answers and the auth tables exist. */
  readonly checkHealth: () => Promise<boolean>;
  readonly clientIp: ClientIpPolicy;
  readonly reportDefect: (cause: unknown) => void;
}

/**
 * futrob-auth HTTP surface (ADR-0015): `/api/auth/*` (Better Auth) and
 * `/meta/health`. Everything else is 404.
 */
export function createAuthApp(deps: AuthAppDeps) {
  const app = new Hono<{ Bindings: Partial<HttpBindings> }>();

  app.get("/meta/health", async (c) => {
    const ok = await deps.checkHealth().catch(() => false);
    return c.json({ ok, service: "futrob-auth" }, ok ? 200 : 503);
  });

  app.all("/api/auth/*", async (c) => {
    const request = c.req.raw;
    const ip = resolveClientIp(
      request.headers,
      c.env?.incoming?.socket.remoteAddress,
      deps.clientIp,
    );
    return deps.handleAuth(withClientIp(request, ip));
  });

  app.notFound(() => new Response(null, { status: 404 }));

  app.onError((cause, c) => {
    console.error(JSON.stringify({ event: "auth.request.failed" }));
    deps.reportDefect(cause);
    return c.json({ code: "auth.unhandled", messageKey: "errors.auth.unhandled" }, 500);
  });

  return app;
}
