import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleDeclineEntryInvitation } from "@/modules/competitions/server/entry-invitations.handler.ts";

export const Route = createFileRoute("/api/v1/entry-invitations/$invitationId/decline")({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        handleDeclineEntryInvitation(request, params, createAuthenticatedProductApiClient),
    },
  },
});
