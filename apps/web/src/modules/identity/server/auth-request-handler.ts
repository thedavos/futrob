import { getWorkerEnv } from "../adapters/auth/worker-env.ts";
import { authServiceFromBindings, forwardAuthRequest } from "./auth-proxy.ts";

/**
 * Better Auth HTTP boundary. Proxy-only since ADR-0015 stage 3.
 *
 * Serving lives in `apps/auth` (Node). Web forwards same-origin `/api/auth/*` to
 * `FUTROB_AUTH_BASE_URL` over HTTP. SSR/BFF session reads use the same service
 * (`GET /api/auth/get-session`); the response already carries the `actorId` (ADR-0021).
 */
export async function handleAuthRequest(request: Request): Promise<Response> {
  const bindings = getWorkerEnv();
  return forwardAuthRequest(request, authServiceFromBindings(bindings));
}
