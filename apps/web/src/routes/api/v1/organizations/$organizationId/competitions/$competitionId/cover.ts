import { createFileRoute } from "@tanstack/react-router";
import {
  updateCompetitionCoverRequestSchema,
  updateCompetitionCoverResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/cover",
)({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const parsed = updateCompetitionCoverRequestSchema.safeParse(
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
            updateCompetitionCoverResponseSchema.parse(
              await client.competitions.updateCover(
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
