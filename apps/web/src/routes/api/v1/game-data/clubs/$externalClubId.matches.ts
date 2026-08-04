import { createFileRoute } from "@tanstack/react-router";
import { getClubMatchesQuerySchema, getClubMatchesResponseSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import {
  apiErrorResponse,
  jsonResponse,
  queryRecord,
} from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/game-data/clubs/$externalClubId/matches")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const url = new URL(request.url);
          const parsed = getClubMatchesQuerySchema.safeParse(queryRecord(url));
          if (!parsed.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          }

          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            getClubMatchesResponseSchema.parse(
              await client.gameData.clubs.matches(params.externalClubId, parsed.data),
            ),
          );
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
