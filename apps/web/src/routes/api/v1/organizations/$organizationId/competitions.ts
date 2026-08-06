import { createFileRoute } from "@tanstack/react-router";
import {
  createCompetitionDraftRequestSchema,
  createCompetitionDraftResponseSchema,
  listOrganizationCompetitionsResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/organizations/$organizationId/competitions")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            listOrganizationCompetitionsResponseSchema.parse(
              await client.competitions.list(params.organizationId),
            ),
          );
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
      POST: async ({ request, params }) => {
        try {
          const parsed = createCompetitionDraftRequestSchema.safeParse(
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
            createCompetitionDraftResponseSchema.parse(
              await client.competitions.createDraft(params.organizationId, parsed.data),
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
