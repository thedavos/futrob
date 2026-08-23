import { getWorkerEnv } from "../adapters/auth/worker-env.ts";
import { forwardAuthRequest } from "./auth-proxy.ts";

/**
 * Better Auth HTTP boundary. Proxy-only since ADR-0015 stage 3.
 *
 * Serving lives in `futrob-auth`. Web forwards same-origin `/api/auth/*`
 * through AUTH_SERVICE. SSR/BFF session reads also go through AUTH_SERVICE
 * (`GET /api/auth/get-session`); web only looks up `identity_subjects` in D1.
 */
export async function handleAuthRequest(request: Request): Promise<Response> {
  const bindings = getWorkerEnv();
  return forwardAuthRequest(request, bindings.AUTH_SERVICE);
}
