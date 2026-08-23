import { getWorkerEnv } from "../adapters/auth/worker-env.ts";
import { proxyAuthRequest, resolveAuthServiceUrl } from "./auth-proxy.ts";

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
  const authServiceUrl = resolveAuthServiceUrl(
    bindings.FUTROB_AUTH_SERVICE_URL,
    process.env.FUTROB_AUTH_SERVICE_URL,
  );

  if (!authServiceUrl) {
    return misconfigured();
  }

  try {
    return await proxyAuthRequest(request, authServiceUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "auth proxy failed";
    console.error(`[auth-proxy] ${message}`);
    return Response.json(
      { code: "auth.unavailable", messageKey: "errors.auth.unavailable" },
      { status: 502 },
    );
  }
}
