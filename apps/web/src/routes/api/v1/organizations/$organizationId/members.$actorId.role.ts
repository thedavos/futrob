import { createFileRoute } from "@tanstack/react-router";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { handleChangeMemberRoleRequest } from "./-member-role.handler.ts";

export const Route = createFileRoute("/api/v1/organizations/$organizationId/members/$actorId/role")(
  {
    server: {
      handlers: {
        PATCH: async ({ request, params }) => {
          let client;
          try {
            ({ client } = await createAuthenticatedProductApiClient(request));
          } catch (error) {
            if (!(error instanceof Error))
              return productApiBffErrorResponse({ kind: "unexpected" });
            return productApiBffErrorResponseForError(error);
          }
          return handleChangeMemberRoleRequest(request, {
            change: (input) =>
              client.authorization.changeOrganizationRole(
                params.organizationId,
                params.actorId,
                input,
                { signal: request.signal },
              ),
          });
        },
      },
    },
  },
);
