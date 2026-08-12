import { createFileRoute } from "@tanstack/react-router";
import {
  createRosterInvitationRequestSchema,
  createRosterInvitationResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/teams/$teamId/roster-invitations",
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const parsed = createRosterInvitationRequestSchema.safeParse(
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
            createRosterInvitationResponseSchema.parse(
              await client.teams.createRosterInvitation(
                params.organizationId,
                params.competitionId,
                params.teamId,
                parsed.data,
              ),
            ),
            201,
          );
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
