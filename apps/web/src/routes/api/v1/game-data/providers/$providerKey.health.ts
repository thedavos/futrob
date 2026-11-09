import { createFileRoute } from "@tanstack/react-router";
import {
  gameDataProviderKeyQuerySchema,
  providerHealthResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/game-data/providers/$providerKey/health")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const providerKey = gameDataProviderKeyQuerySchema.safeParse(params.providerKey);
          if (!providerKey.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: providerKey.error.issues },
            });
          }

          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            providerHealthResponseSchema.parse(
              await client.gameData.providers.health(providerKey.data),
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
