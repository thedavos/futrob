import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleRevokeEntryInvitation } from "@/modules/competitions/server/entry-invitations.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/entry-invitations/$invitationId",
)({
  server: {
    handlers: {
      DELETE: ({ request, params }) =>
        handleRevokeEntryInvitation(request, params, createAuthenticatedProductApiClient),
    },
  },
});
