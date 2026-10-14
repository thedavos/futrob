import { resolvePostAuthDestinationResponseSchema } from "../organizations/schemas.ts";
import { API_ERROR_RESPONSE, jsonContent, zodOpenApiSchema } from "./openapi-fragments.ts";

export const postAuthDestinationOpenApiPaths = {
  "/organizations/post-auth-destination": {
    get: {
      operationId: "resolvePostAuthDestination",
      tags: ["organizations"],
      summary: "Resolve where an authenticated actor should land after sign-in",
      responses: {
        "200": {
          description: "Onboarding, personal space, an organization, or a picker",
          content: jsonContent("ResolvePostAuthDestinationResponse"),
        },
        "401": API_ERROR_RESPONSE,
      },
    },
  },
} as const;

export const postAuthDestinationOpenApiSchemas = {
  ResolvePostAuthDestinationResponse: zodOpenApiSchema(
    resolvePostAuthDestinationResponseSchema,
    "output",
  ),
};
