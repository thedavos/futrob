import { createFileRoute } from "@tanstack/react-router";
import {
  acceptCompetitionInvitationResponseSchema,
  acceptInvitationRequestSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import { runRateLimitedBffRequest } from "@/shared/infrastructure/rate-limit/bff-rate-limit-guard.ts";
import { BFF_RATE_LIMIT_POLICY } from "@/shared/infrastructure/rate-limit/bff-rate-limiter.ts";
import { enforceBffRateLimit } from "@/shared/infrastructure/rate-limit/enforce-bff-rate-limit.ts";

export const Route = createFileRoute("/api/v1/competitions/invitations/accept")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await runRateLimitedBffRequest({
            request,
            policy: BFF_RATE_LIMIT_POLICY.invitationAccept,
            authenticate: () => createAuthenticatedProductApiClient(request),
            enforce: enforceBffRateLimit,
            next: async ({ client }) => {
              const parsed = acceptInvitationRequestSchema.safeParse(
                await request.json().catch(() => null),
              );
              if (!parsed.success) {
                return apiErrorResponse(400, {
                  code: "api.validation_error",
                  messageKey: "errors.api.validation_error",
                  details: { issues: parsed.error.issues },
                });
              }
              return jsonResponse(
                acceptCompetitionInvitationResponseSchema.parse(
                  await client.competitions.acceptInvitation(parsed.data),
                ),
              );
            },
          });
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
