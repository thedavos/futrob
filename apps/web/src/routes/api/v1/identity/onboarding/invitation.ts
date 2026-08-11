import { createFileRoute } from "@tanstack/react-router";
import {
  completeInvitationOnboardingRequestSchema,
  completeInvitationOnboardingResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import { withBffRequestCorrelation } from "@/shared/infrastructure/http/request-correlation.ts";

export const Route = createFileRoute("/api/v1/identity/onboarding/invitation")({
  server: {
    handlers: {
      POST: ({ request }) =>
        withBffRequestCorrelation(request, async ({ requestId }) => {
          try {
            const parsed = completeInvitationOnboardingRequestSchema.safeParse(
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
              completeInvitationOnboardingResponseSchema.parse(
                await client.identity.completeInvitationOnboarding(parsed.data),
              ),
            );
          } catch (error) {
            return productApiBffErrorResponse(error, requestId);
          }
        }),
    },
  },
});
