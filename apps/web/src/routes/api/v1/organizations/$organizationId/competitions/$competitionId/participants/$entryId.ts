import { createFileRoute } from "@tanstack/react-router";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/participants/$entryId",
)({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          await client.competitions.removeParticipant(
            params.organizationId,
            params.competitionId,
            params.entryId,
          );
          return new Response(null, { status: 204 });
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
