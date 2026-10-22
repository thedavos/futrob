import { createFileRoute } from "@tanstack/react-router";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { handleGetCompetitionRankingsRequest } from "./-rankings.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/rankings",
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        let client;
        try {
          ({ client } = await createAuthenticatedProductApiClient(request));
        } catch (error) {
          if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
          return productApiBffErrorResponseForError(error);
        }
        return handleGetCompetitionRankingsRequest(request, {
          load: (query) =>
            client.statistics.getCompetitionRankings({
              organizationId: params.organizationId,
              competitionId: params.competitionId,
              ...query,
            }),
        });
      },
    },
  },
});
