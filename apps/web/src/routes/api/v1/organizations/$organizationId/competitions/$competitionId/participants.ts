import { createFileRoute } from "@tanstack/react-router";
import {
  addCompetitionParticipantResponseSchema,
  competitionParticipantInputSchema,
  listCompetitionParticipantsResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/participants",
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            listCompetitionParticipantsResponseSchema.parse(
              await client.competitions.listParticipants(
                params.organizationId,
                params.competitionId,
              ),
            ),
          );
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
      POST: async ({ request, params }) => {
        try {
          const parsed = competitionParticipantInputSchema.safeParse(
            await request.json().catch(() => null),
          );
          if (!parsed.success)
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            addCompetitionParticipantResponseSchema.parse(
              await client.competitions.addParticipant(
                params.organizationId,
                params.competitionId,
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
