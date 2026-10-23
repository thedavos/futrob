import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleGetCompetitionStandings } from "@/modules/statistics/server/competition-standings.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/standings",
)({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleGetCompetitionStandings(request, params, (incoming) =>
          createAuthenticatedProductApiClient(incoming),
        ),
    },
  },
});
