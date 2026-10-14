import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleListMyEntryInvitations } from "@/modules/competitions/server/entry-invitations.handler.ts";

export const Route = createFileRoute("/api/v1/players/me/entry-invitations")({
  server: {
    handlers: {
      GET: ({ request }) =>
        handleListMyEntryInvitations(request, createAuthenticatedProductApiClient),
    },
  },
});
