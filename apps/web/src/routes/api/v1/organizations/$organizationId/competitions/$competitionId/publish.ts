import { createFileRoute } from "@tanstack/react-router";
import { publishCompetitionResponseSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/publish",
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            publishCompetitionResponseSchema.parse(
              await client.competitions.publish(params.organizationId, params.competitionId),
            ),
          );
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
