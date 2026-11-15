import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import {
  handleImposeSanction,
  handleListCompetitionSanctions,
} from "@/modules/competitions/server/sanctions.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/sanctions",
)({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleListCompetitionSanctions(request, params, createAuthenticatedProductApiClient),
      POST: ({ request, params }) =>
        handleImposeSanction(request, params, createAuthenticatedProductApiClient),
    },
  },
});
