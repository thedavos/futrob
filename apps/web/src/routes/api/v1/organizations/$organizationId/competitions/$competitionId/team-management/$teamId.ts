import { createFileRoute } from "@tanstack/react-router";
import { competitionTeamManagementDetailResponseSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/team-management/$teamId",
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            competitionTeamManagementDetailResponseSchema.parse(
              await client.teams.getCompetitionTeamManagement(
                params.organizationId,
                params.competitionId,
                params.teamId,
              ),
            ),
          );
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
