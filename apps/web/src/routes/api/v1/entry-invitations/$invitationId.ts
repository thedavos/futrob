import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handlePreviewEntryInvitation } from "@/modules/competitions/server/entry-invitations.handler.ts";

export const Route = createFileRoute("/api/v1/entry-invitations/$invitationId")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handlePreviewEntryInvitation(
          request,
          { invitationId: params.invitationId },
          createAuthenticatedProductApiClient,
        ),
    },
  },
});
