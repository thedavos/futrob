import { createFileRoute } from "@tanstack/react-router";
import { getClubQuerySchema, getClubResponseSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import {
  apiErrorResponse,
  jsonResponse,
  queryRecord,
} from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/game-data/clubs/$externalClubId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const url = new URL(request.url);
          const parsed = getClubQuerySchema.safeParse(queryRecord(url));
          if (!parsed.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          }

          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            getClubResponseSchema.parse(
              await client.gameData.clubs.retrieve(params.externalClubId, parsed.data),
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
