import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleCloseSwissRound } from "@/modules/scheduling/server/competition-fixture.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/fixtures/$fixturePlanId/swiss/rounds/$roundNumber/close",
)({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        handleCloseSwissRound(request, params, (incoming) =>
          createAuthenticatedProductApiClient(incoming),
        ),
    },
  },
});
