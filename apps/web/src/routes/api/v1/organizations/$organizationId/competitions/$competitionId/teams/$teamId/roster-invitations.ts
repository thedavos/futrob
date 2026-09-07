import { createFileRoute } from "@tanstack/react-router";
import {
  createRosterInvitationRequestSchema,
  createRosterInvitationResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { fetchAuthSessionUserName } from "@/modules/identity/server/auth-proxy.ts";
import { getWorkerBindings } from "@/modules/identity/server/worker-bindings.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/teams/$teamId/roster-invitations",
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const parsed = createRosterInvitationRequestSchema.safeParse(
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
          // The inviter's display name is snapshotted server-side from the
          // Better Auth session; the browser cannot set or forge it.
          const bindings = await getWorkerBindings();
          const invitedByDisplayName = await fetchAuthSessionUserName(
            request,
            bindings.AUTH_SERVICE,
          );
          return jsonResponse(
            createRosterInvitationResponseSchema.parse(
              await client.teams.createRosterInvitation(
                params.organizationId,
                params.competitionId,
                params.teamId,
                { ...parsed.data, invitedByDisplayName },
              ),
            ),
            201,
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
