import { getMyRecentMatchesResponseSchema } from "@futrob/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import { runRateLimitedBffRequest } from "@/shared/infrastructure/rate-limit/bff-rate-limit-guard.ts";
import { BFF_RATE_LIMIT_POLICY } from "@/shared/infrastructure/rate-limit/bff-rate-limiter.ts";
import { enforceBffRateLimit } from "@/shared/infrastructure/rate-limit/enforce-bff-rate-limit.ts";

export const Route = createFileRoute("/api/v1/players/me/recent-matches")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await runRateLimitedBffRequest({
            request,
            policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
            authenticate: () => createAuthenticatedProductApiClient(request),
            enforce: enforceBffRateLimit,
            next: async ({ client }) =>
              jsonResponse(
                getMyRecentMatchesResponseSchema.parse(
                  await client.statistics.getMyRecentMatches(),
                ),
              ),
          });
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
