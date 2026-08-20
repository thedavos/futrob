import { createFileRoute } from "@tanstack/react-router";
import {
  acceptInvitationRequestSchema,
  acceptInvitationResponseSchema,
} from "@futrob/api-contracts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import {
  createAuthenticatedOrganizationsClient,
  organizationsBffErrorResponse,
} from "@/modules/organizations/server/create-authenticated-organizations-client.ts";
import { productApiBffErrorResponse } from "@/context/product-api-bff-error-response.ts";
import { runRateLimitedBffRequest } from "@/shared/infrastructure/rate-limit/bff-rate-limit-guard.ts";
import { BFF_RATE_LIMIT_POLICY } from "@/shared/infrastructure/rate-limit/bff-rate-limiter.ts";
import { enforceBffRateLimit } from "@/shared/infrastructure/rate-limit/enforce-bff-rate-limit.ts";

export const Route = createFileRoute("/api/v1/organizations/invitations/accept")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await runRateLimitedBffRequest({
            request,
            policy: BFF_RATE_LIMIT_POLICY.invitationAccept,
            authenticate: () => createAuthenticatedOrganizationsClient(request),
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
              const body = acceptInvitationResponseSchema.parse(
                await client.organizations.acceptInvitation(parsed.data),
              );
              return jsonResponse(body);
            },
          });
        } catch (error) {
          if (!(error instanceof Error)) {
            return productApiBffErrorResponse({ kind: "unexpected" });
          }
          return organizationsBffErrorResponse(error);
        }
      },
    },
  },
});
