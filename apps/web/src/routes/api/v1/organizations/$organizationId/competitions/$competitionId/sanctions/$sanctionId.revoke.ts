import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleRevokeSanction } from "@/modules/competitions/server/sanctions.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/sanctions/$sanctionId/revoke",
)({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        handleRevokeSanction(request, params, createAuthenticatedProductApiClient),
    },
  },
});
