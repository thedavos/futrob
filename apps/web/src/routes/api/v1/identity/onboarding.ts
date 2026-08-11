import { createFileRoute } from "@tanstack/react-router";
import {
  getOnboardingStatusResponseSchema,
  saveOnboardingProgressRequestSchema,
  saveOnboardingProgressResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import { withBffRequestCorrelation } from "@/shared/infrastructure/http/request-correlation.ts";

export const Route = createFileRoute("/api/v1/identity/onboarding")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withBffRequestCorrelation(request, async ({ requestId }) => {
          try {
            const { client } = await createAuthenticatedProductApiClient(request, requestId);
            const body = getOnboardingStatusResponseSchema.parse(
              await client.identity.getOnboardingStatus(),
            );
            return jsonResponse(body);
          } catch (error) {
            return productApiBffErrorResponse(error, requestId);
          }
        }),
      PATCH: ({ request }) =>
        withBffRequestCorrelation(request, async ({ requestId }) => {
          try {
            const json: unknown = await request.json().catch(() => null);
            const parsed = saveOnboardingProgressRequestSchema.safeParse(json);
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
            const body = saveOnboardingProgressResponseSchema.parse(
              await client.identity.saveOnboardingProgress(parsed.data),
            );
            return jsonResponse(body);
          } catch (error) {
            return productApiBffErrorResponse(error, requestId);
          }
        }),
    },
  },
});
