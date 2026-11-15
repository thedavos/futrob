import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleListTeamSanctions } from "@/modules/competitions/server/sanctions.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/teams/$teamId/sanctions",
)({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleListTeamSanctions(request, params, createAuthenticatedProductApiClient),
    },
  },
});
