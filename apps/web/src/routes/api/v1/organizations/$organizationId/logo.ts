import { createFileRoute } from "@tanstack/react-router";
import { organizationProfileSchema, setOrganizationLogoRequestSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

/** Registers a logo already stored through `logo/$uploadKey`, or returns to the monogram. */
export const Route = createFileRoute("/api/v1/organizations/$organizationId/logo")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const parsed = setOrganizationLogoRequestSchema.safeParse(
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
            organizationProfileSchema.parse(
              await client.organizations.setLogo(params.organizationId, parsed.data),
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
