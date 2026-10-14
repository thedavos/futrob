import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleAcceptEntryInvitation } from "@/modules/competitions/server/entry-invitations.handler.ts";
import { runRateLimitedBffRequest } from "@/shared/infrastructure/rate-limit/bff-rate-limit-guard.ts";
import { BFF_RATE_LIMIT_POLICY } from "@/shared/infrastructure/rate-limit/bff-rate-limiter.ts";
import { enforceBffRateLimit } from "@/shared/infrastructure/rate-limit/enforce-bff-rate-limit.ts";

export const Route = createFileRoute("/api/v1/entry-invitations/$invitationId/accept")({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        runRateLimitedBffRequest({
          request,
          policy: BFF_RATE_LIMIT_POLICY.invitationAccept,
          authenticate: () => createAuthenticatedProductApiClient(request),
          enforce: enforceBffRateLimit,
          next: (connected) =>
            handleAcceptEntryInvitation(request, { invitationId: params.invitationId }, () =>
              Promise.resolve(connected),
            ),
        }),
    },
  },
});
