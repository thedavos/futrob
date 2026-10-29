import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleGetCurrentCompetitionFixture } from "@/modules/scheduling/server/competition-fixture.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/fixture",
)({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleGetCurrentCompetitionFixture(request, params, (incoming) =>
          createAuthenticatedProductApiClient(incoming),
        ),
    },
  },
});
