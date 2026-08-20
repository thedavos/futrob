import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { runRateLimitedBffRequest } from "@/shared/infrastructure/rate-limit/bff-rate-limit-guard.ts";
import { BFF_RATE_LIMIT_POLICY } from "@/shared/infrastructure/rate-limit/bff-rate-limiter.ts";
import { enforceBffRateLimit } from "@/shared/infrastructure/rate-limit/enforce-bff-rate-limit.ts";
import { handleGetMyRecentMatchRequest } from "../-detail.handler.ts";

export const Route = createFileRoute(
  "/api/v1/players/me/recent-matches/$providerKey/$externalMatchId",
)({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        runRateLimitedBffRequest({
          request,
          policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
          authenticate: () => createAuthenticatedProductApiClient(request),
          enforce: enforceBffRateLimit,
          next: ({ client }) =>
            handleGetMyRecentMatchRequest(request, params, {
              load: (input) => client.statistics.getMyRecentMatch(input),
            }),
        }),
    },
  },
});
