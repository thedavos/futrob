import { createFileRoute } from "@tanstack/react-router";
import {
  completeOnboardingRequestSchema,
  completeOnboardingResponseSchema,
  getOnboardingStatusResponseSchema,
  saveOnboardingProgressRequestSchema,
  saveOnboardingProgressResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/identity/onboarding")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          const body = getOnboardingStatusResponseSchema.parse(
            await client.identity.getOnboardingStatus(),
          );
          return jsonResponse(body);
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const json: unknown = await request.json().catch(() => null);
          const parsed = completeOnboardingRequestSchema.safeParse(json);
          if (!parsed.success) {
            return jsonResponse(
              {
                code: "api.validation_error",
                messageKey: "errors.api.validation_error",
                details: { issues: parsed.error.issues },
              },
              400,
            );
          }

          const { client } = await createAuthenticatedProductApiClient(request);
          const body = completeOnboardingResponseSchema.parse(
            await client.identity.completeOnboarding(parsed.data),
          );
          return jsonResponse(body);
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
      PATCH: async ({ request }) => {
        try {
          const json: unknown = await request.json().catch(() => null);
          const parsed = saveOnboardingProgressRequestSchema.safeParse(json);
          if (!parsed.success) {
            return jsonResponse(
              {
                code: "api.validation_error",
                messageKey: "errors.api.validation_error",
                details: { issues: parsed.error.issues },
              },
              400,
            );
          }

          const { client } = await createAuthenticatedProductApiClient(request);
          const body = saveOnboardingProgressResponseSchema.parse(
            await client.identity.saveOnboardingProgress(parsed.data),
          );
          return jsonResponse(body);
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
