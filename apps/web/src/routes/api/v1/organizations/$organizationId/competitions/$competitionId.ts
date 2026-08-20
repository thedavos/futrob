import { createFileRoute } from "@tanstack/react-router";
import {
  getCompetitionDraftResponseSchema,
  updateCompetitionDraftRequestSchema,
  updateCompetitionDraftResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId",
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            getCompetitionDraftResponseSchema.parse(
              await client.competitions.getDraft(params.organizationId, params.competitionId),
            ),
          );
        } catch (error) {
          if (!(error instanceof Error)) {
            return productApiBffErrorResponse({ kind: "unexpected" });
          }
          return productApiBffErrorResponseForError(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const parsed = updateCompetitionDraftRequestSchema.safeParse(
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
            updateCompetitionDraftResponseSchema.parse(
              await client.competitions.updateDraft(
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
