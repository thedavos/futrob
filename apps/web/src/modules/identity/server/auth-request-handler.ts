import { getWorkerEnv } from "../adapters/auth/worker-env.ts";
import { proxyAuthRequest } from "./auth-proxy.ts";

function misconfigured() {
  return Response.json(
    { code: "auth.misconfigured", messageKey: "errors.auth.misconfigured" },
    { status: 503 },
  );
}

/**
 * Better Auth HTTP boundary. Proxy-only since ADR-0015 stage 3.
 *
 * Serving lives in `futrob-auth`. Web forwards same-origin requests.
 * Session reads for SSR/BFF resolve locally against D1.
 */
export async function handleAuthRequest(request: Request): Promise<Response> {
  const bindings = getWorkerEnv();
  if (!bindings.AUTH_SERVICE) {
    return misconfigured();
  }

  try {
    return await proxyAuthRequest(request, bindings.AUTH_SERVICE);
  } catch {
    console.error(JSON.stringify({ event: "auth.proxy.upstream_failed" }));
    return Response.json(
      { code: "auth.unavailable", messageKey: "errors.auth.unavailable" },
      { status: 502 },
    );
  }
}
