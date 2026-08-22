import { getWorkerEnv } from "../adapters/auth/worker-env.ts";

function misconfigured() {
  return Response.json(
    { code: "auth.misconfigured", messageKey: "errors.auth.misconfigured" },
    { status: 503 },
  );
}

/**
 * Better Auth HTTP boundary — proxy-only since ADR-0015 stage 3.
 *
 * Serving moved to the standalone `futrob-auth` worker; web forwards
 * same-origin requests (cookies and Bearer flow through untouched). Session
 * *reads* for SSR/BFF still resolve locally against D1
 * (`server/authenticated-request-actor.ts`); the schema files under
 * `../adapters/auth/` are a read model mirror owned by `apps/auth`.
 */
export async function handleAuthRequest(request: Request): Promise<Response> {
  const bindings = getWorkerEnv();
  const authServiceUrl = bindings.FUTROB_AUTH_SERVICE_URL ?? process.env.FUTROB_AUTH_SERVICE_URL;

  if (!authServiceUrl) {
    return misconfigured();
  }

  const incoming = new URL(request.url);
  const base = authServiceUrl.replace(/\/$/, "");
  const target = `${base}${incoming.pathname}${incoming.search}`;

  try {
    return await fetch(new Request(target, request));
  } catch (error) {
    const message = error instanceof Error ? error.message : "auth proxy failed";
    console.error(`[auth-proxy] ${message}`);
    return Response.json(
      { code: "auth.unavailable", messageKey: "errors.auth.unavailable" },
      { status: 502 },
    );
  }
}
