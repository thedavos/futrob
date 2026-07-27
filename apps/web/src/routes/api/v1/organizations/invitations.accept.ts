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

export const Route = createFileRoute("/api/v1/organizations/invitations/accept")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json: unknown = await request.json().catch(() => null);
          const parsed = acceptInvitationRequestSchema.safeParse(json);
          if (!parsed.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          }

          const { client } = await createAuthenticatedOrganizationsClient(request);
          const body = acceptInvitationResponseSchema.parse(
            await client.organizations.acceptInvitation(parsed.data),
          );
          return jsonResponse(body);
        } catch (error) {
          return organizationsBffErrorResponse(error);
        }
      },
    },
  },
});
