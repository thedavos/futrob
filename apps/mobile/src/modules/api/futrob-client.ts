import { createFutrobClient, type FutrobClient } from "@futrob/sdk";
import { API_BASE_URL } from "@/config/env";
import { getSession } from "@/modules/identity/session-store";

export { FutrobApiError } from "@futrob/sdk";

/**
 * Typed product-API client for /api/v1. The session token stored by
 * `auth-api` (Better Auth) is presented as Bearer — supported since the
 * server enabled the `bearer()` plugin (ADR-0014 follow-up).
 */
export function getFutrobClient(): FutrobClient {
  return createFutrobClient({
    baseUrl: `${API_BASE_URL}/api/v1`,
    getAccessToken: async () => (await getSession())?.token,
  });
}
