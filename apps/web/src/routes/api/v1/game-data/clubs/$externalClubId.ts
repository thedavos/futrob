import { createFileRoute } from "@tanstack/react-router";
import { getClubQuerySchema, getClubResponseSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import {
  apiErrorResponse,
  jsonResponse,
  queryRecord,
} from "@/shared/infrastructure/http/api-response.ts";
import { withBffRequestCorrelation } from "@/shared/infrastructure/http/request-correlation.ts";

export const Route = createFileRoute("/api/v1/game-data/clubs/$externalClubId")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withBffRequestCorrelation(request, async ({ requestId }) => {
          try {
            const url = new URL(request.url);
            const parsed = getClubQuerySchema.safeParse(queryRecord(url));
            if (!parsed.success) {
              return apiErrorResponse(
                400,
                {
                  code: "api.validation_error",
                  messageKey: "errors.api.validation_error",
                  details: { issues: parsed.error.issues },
                },
                requestId,
              );
            }

            const { client } = await createAuthenticatedProductApiClient(request, requestId);
            return jsonResponse(
              getClubResponseSchema.parse(
                await client.gameData.clubs.retrieve(params.externalClubId, parsed.data),
              ),
            );
          } catch (error) {
            return productApiBffErrorResponse(error, requestId);
          }
        }),
    },
  },
});
