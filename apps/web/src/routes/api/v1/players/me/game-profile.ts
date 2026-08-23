import { getMyGameProfileQuerySchema, getMyGameProfileResponseSchema } from "@futrob/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import {
  apiErrorResponse,
  jsonResponse,
  queryRecord,
} from "@/shared/infrastructure/http/api-response.ts";
import { runRateLimitedBffRequest } from "@/shared/infrastructure/rate-limit/bff-rate-limit-guard.ts";
import { BFF_RATE_LIMIT_POLICY } from "@/shared/infrastructure/rate-limit/bff-rate-limiter.ts";
import { enforceBffRateLimit } from "@/shared/infrastructure/rate-limit/enforce-bff-rate-limit.ts";

export const Route = createFileRoute("/api/v1/players/me/game-profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const parsed = getMyGameProfileQuerySchema.safeParse(queryRecord(new URL(request.url)));
          if (!parsed.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          }

          return await runRateLimitedBffRequest({
            request,
            policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
            authenticate: () => createAuthenticatedProductApiClient(request),
            enforce: enforceBffRateLimit,
            next: async ({ client }) =>
              jsonResponse(
                getMyGameProfileResponseSchema.parse(
                  await client.statistics.getMyGameProfile(parsed.data),
                ),
              ),
          });
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
