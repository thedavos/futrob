import { createFileRoute } from "@tanstack/react-router";
import {
  competitionTeamManagementListQuerySchema,
  competitionTeamManagementListResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/team-management",
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const parsed = competitionTeamManagementListQuerySchema.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          if (!parsed.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          }
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            competitionTeamManagementListResponseSchema.parse(
              await client.teams.listCompetitionManagement(
                params.organizationId,
                params.competitionId,
                parsed.data,
              ),
            ),
          );
        } catch (error) {
          if (!(error instanceof Error)) {
            return productApiBffErrorResponse({ kind: "unexpected" });
          }
          return productApiBffErrorResponseForError(error);
        }
      },
    },
  },
});
