import { createFileRoute } from "@tanstack/react-router";
import {
  completePlayerOnboardingRequestSchema,
  completePlayerOnboardingResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import { withBffRequestCorrelation } from "@/shared/infrastructure/http/request-correlation.ts";

export const Route = createFileRoute("/api/v1/identity/onboarding/player")({
  server: {
    handlers: {
      POST: ({ request }) =>
        withBffRequestCorrelation(request, async ({ requestId }) => {
          try {
            const parsed = completePlayerOnboardingRequestSchema.safeParse(
              await request.json().catch(() => null),
            );
            if (!parsed.success) {
              return apiErrorResponse(
                400,
                {
                  code: "api.validation_error",
                  messageKey: "errors.api.validation_error",
                  details: { issues: parsed.error.issues },
                },
                requestId,
              );
            }
            const { client } = await createAuthenticatedProductApiClient(request, requestId);
            return jsonResponse(
              completePlayerOnboardingResponseSchema.parse(
                await client.identity.completePlayerOnboarding(parsed.data),
              ),
            );
          } catch (error) {
            return productApiBffErrorResponse(error, requestId);
          }
        }),
    },
  },
});
