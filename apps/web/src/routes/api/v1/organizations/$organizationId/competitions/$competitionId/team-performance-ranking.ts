import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleGetTeamPerformanceRankingRequest } from "./-team-performance-ranking.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/team-performance-ranking",
)({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleGetTeamPerformanceRankingRequest(params, {
          load: async (scope) => {
            const { client } = await createAuthenticatedProductApiClient(request);
            return client.statistics.getTeamPerformanceRanking(scope);
          },
        }),
    },
  },
});
