import { createFileRoute } from "@tanstack/react-router";
import { setActiveTeamRequestSchema, setActiveTeamResponseSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/players/me/active-team")({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        try {
          const parsed = setActiveTeamRequestSchema.safeParse(
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
            setActiveTeamResponseSchema.parse(await client.teams.setActiveTeam(parsed.data)),
          );
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
