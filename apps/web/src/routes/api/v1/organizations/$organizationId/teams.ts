import { createFileRoute } from "@tanstack/react-router";
import { listOrganizationTeamsResponseSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/organizations/$organizationId/teams")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            listOrganizationTeamsResponseSchema.parse(
              await client.teams.listByOrganization(params.organizationId),
            ),
          );
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
