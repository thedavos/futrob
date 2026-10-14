import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleEntryInvitationLink } from "@/modules/competitions/server/entry-invitations.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/entry-invitations/link",
)({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        handleEntryInvitationLink(request, params, createAuthenticatedProductApiClient, {
          regenerate: false,
        }),
    },
  },
});
