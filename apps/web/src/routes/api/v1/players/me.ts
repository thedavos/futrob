import { createFileRoute } from "@tanstack/react-router";
import { getMyPlayerProfileResponseSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/players/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            getMyPlayerProfileResponseSchema.parse(await client.teams.getMyProfile()),
          );
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
