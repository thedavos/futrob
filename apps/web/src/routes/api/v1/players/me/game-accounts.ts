import { createFileRoute } from "@tanstack/react-router";
import {
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/players/me/game-accounts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = addMyPlayerGameAccountRequestSchema.safeParse(
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
            addMyPlayerGameAccountResponseSchema.parse(
              await client.teams.addMyGameAccount(parsed.data),
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
