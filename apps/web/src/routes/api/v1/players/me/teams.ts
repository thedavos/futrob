import { createFileRoute } from "@tanstack/react-router";
import { getMyTeamsResponseSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/players/me/teams")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(getMyTeamsResponseSchema.parse(await client.teams.getMyTeams()));
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
