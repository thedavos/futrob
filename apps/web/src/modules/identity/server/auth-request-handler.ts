import { getWorkerEnv } from "../adapters/auth/worker-env.ts";
import { forwardAuthRequest } from "./auth-proxy.ts";

/**
 * Better Auth HTTP boundary. Proxy-only since ADR-0015 stage 3.
 *
 * Serving lives in `futrob-auth`. Web forwards same-origin requests
 * through the AUTH_SERVICE binding. Session reads for SSR/BFF resolve
 * locally against D1.
 */
export async function handleAuthRequest(request: Request): Promise<Response> {
  const bindings = getWorkerEnv();
  return forwardAuthRequest(request, bindings.AUTH_SERVICE);
}
