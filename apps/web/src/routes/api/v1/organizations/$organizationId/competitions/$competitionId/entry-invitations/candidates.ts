import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleSearchEntryInvitees } from "@/modules/competitions/server/entry-invitations.handler.ts";
import { runRateLimitedBffRequest } from "@/shared/infrastructure/rate-limit/bff-rate-limit-guard.ts";
import { BFF_RATE_LIMIT_POLICY } from "@/shared/infrastructure/rate-limit/bff-rate-limiter.ts";
import { enforceBffRateLimit } from "@/shared/infrastructure/rate-limit/enforce-bff-rate-limit.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/entry-invitations/candidates",
)({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        runRateLimitedBffRequest({
          request,
          policy: BFF_RATE_LIMIT_POLICY.playerSearch,
          authenticate: () => createAuthenticatedProductApiClient(request),
          enforce: enforceBffRateLimit,
          next: (connected) =>
            handleSearchEntryInvitees(request, params, () => Promise.resolve(connected)),
        }),
    },
  },
});
