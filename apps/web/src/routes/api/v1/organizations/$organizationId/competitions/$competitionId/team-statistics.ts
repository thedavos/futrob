import { createFileRoute } from "@tanstack/react-router";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { handleGetCompetitionTeamStatisticsRequest } from "./-team-statistics.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/team-statistics",
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return handleGetCompetitionTeamStatisticsRequest(params, {
            load: (scope) => client.statistics.getCompetitionTeamStatistics(scope),
          });
        } catch (error) {
          if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
          return productApiBffErrorResponseForError(error);
        }
      },
    },
  },
});
