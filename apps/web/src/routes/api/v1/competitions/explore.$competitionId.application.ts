import {
  applyToCompetitionRequestSchema,
  applyToCompetitionResponseSchema,
  getMyCompetitionApplicationResponseSchema,
} from "@futrob/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/competitions/explore/$competitionId/application")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            getMyCompetitionApplicationResponseSchema.parse(
              await client.competitions.getMyApplication(params.competitionId),
            ),
          );
        } catch (error) {
          if (!(error instanceof Error)) {
            return productApiBffErrorResponse({ kind: "unexpected" });
          }
          return productApiBffErrorResponseForError(error);
        }
      },
      POST: async ({ params, request }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          const parsed = applyToCompetitionRequestSchema.safeParse(
            await request.json().catch(() => null),
          );
          if (!parsed.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          }
          return jsonResponse(
            applyToCompetitionResponseSchema.parse(
              await client.competitions.apply(params.competitionId, parsed.data),
            ),
            201,
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
