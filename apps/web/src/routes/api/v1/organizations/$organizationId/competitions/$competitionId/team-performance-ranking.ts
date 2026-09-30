import { createFileRoute } from "@tanstack/react-router";
import { getTeamPerformanceRankingResponseSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/team-performance-ranking",
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            getTeamPerformanceRankingResponseSchema.parse(
              await client.statistics.getTeamPerformanceRanking({
                organizationId: params.organizationId,
                competitionId: params.competitionId,
              }),
            ),
          );
        } catch (error) {
          if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
          return productApiBffErrorResponseForError(error);
        }
      },
    },
  },
});
