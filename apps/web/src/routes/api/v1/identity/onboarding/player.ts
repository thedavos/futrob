import { createFileRoute } from "@tanstack/react-router";
import {
  completePlayerOnboardingRequestSchema,
  completePlayerOnboardingResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/identity/onboarding/player")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = completePlayerOnboardingRequestSchema.safeParse(
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
            completePlayerOnboardingResponseSchema.parse(
              await client.identity.completePlayerOnboarding(parsed.data),
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
