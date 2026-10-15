import { createFileRoute } from "@tanstack/react-router";
import { createAnonymousProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handlePublicEntryInvitationLink } from "@/modules/competitions/server/entry-invitations.handler.ts";
import { BFF_RATE_LIMIT_POLICY } from "@/shared/infrastructure/rate-limit/bff-rate-limiter.ts";
import { enforceBffRateLimit } from "@/shared/infrastructure/rate-limit/enforce-bff-rate-limit.ts";

export const Route = createFileRoute("/api/v1/entry-invitations/links/$code/public")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const connected = await createAnonymousProductApiClient(request);
        const rejection = await enforceBffRateLimit({
          request,
          actorId: null,
          requestId: connected.requestId,
          policy: BFF_RATE_LIMIT_POLICY.invitationPublicPreview,
        });
        if (rejection) return rejection;
        return handlePublicEntryInvitationLink(request, params.code, () =>
          Promise.resolve(connected),
        );
      },
    },
  },
});
