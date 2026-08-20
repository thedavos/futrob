import { createFileRoute } from "@tanstack/react-router";
import {
  createOrganizationInvitationRequestSchema,
  createInvitationResponseSchema,
} from "@futrob/api-contracts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import {
  createAuthenticatedOrganizationsClient,
  organizationsBffErrorResponse,
} from "@/modules/organizations/server/create-authenticated-organizations-client.ts";
import { productApiBffErrorResponse } from "@/context/product-api-bff-error-response.ts";

export const Route = createFileRoute("/api/v1/organizations/$organizationId/invitations")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const json: unknown = await request.json().catch(() => null);
          const parsed = createOrganizationInvitationRequestSchema.safeParse(json);
          if (!parsed.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          }

          const { client } = await createAuthenticatedOrganizationsClient(request);
          const body = createInvitationResponseSchema.parse(
            await client.organizations.createInvitation(params.organizationId, parsed.data),
          );
          return jsonResponse(body, 201);
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
