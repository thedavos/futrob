import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import {
  handleInviteTeamCaptain,
  handleListSentEntryInvitations,
} from "@/modules/competitions/server/entry-invitations.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/entry-invitations",
)({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleListSentEntryInvitations(request, params, createAuthenticatedProductApiClient),
      POST: ({ request, params }) =>
        handleInviteTeamCaptain(request, params, createAuthenticatedProductApiClient),
    },
  },
});
