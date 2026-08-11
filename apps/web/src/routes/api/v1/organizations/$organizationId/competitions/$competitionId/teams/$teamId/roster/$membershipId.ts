import { createFileRoute } from "@tanstack/react-router";
import {
  changeRosterRoleRequestSchema,
  changeRosterRoleResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/teams/$teamId/roster/$membershipId",
)({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const parsed = changeRosterRoleRequestSchema.safeParse(
            await request.json().catch(() => null),
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
            changeRosterRoleResponseSchema.parse(
              await client.teams.changeRosterRole(
                params.organizationId,
                params.competitionId,
                params.teamId,
                params.membershipId,
                parsed.data,
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
