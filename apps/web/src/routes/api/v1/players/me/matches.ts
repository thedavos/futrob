import { getMyMatchesQuerySchema, getMyMatchesResponseSchema } from "@futrob/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import {
  apiErrorResponse,
  jsonResponse,
  queryRecord,
} from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/players/me/matches")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const parsed = getMyMatchesQuerySchema.safeParse(queryRecord(new URL(request.url)));
          if (!parsed.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          }

          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            getMyMatchesResponseSchema.parse(await client.statistics.getMyMatches(parsed.data)),
          );
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
