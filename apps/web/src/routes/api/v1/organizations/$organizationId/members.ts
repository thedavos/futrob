import {
  listOrganizationMembersQuerySchema,
  listOrganizationMembersResponseSchema,
} from "@futrob/api-contracts";
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

export const Route = createFileRoute("/api/v1/organizations/$organizationId/members")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const parsed = listOrganizationMembersQuerySchema.safeParse(
            queryRecord(new URL(request.url)),
          );
          if (!parsed.success)
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            listOrganizationMembersResponseSchema.parse(
              await client.organizations.listMembers(params.organizationId, {
                signal: request.signal,
              }),
            ),
          );
        } catch (error) {
          if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
          return productApiBffErrorResponseForError(error);
        }
      },
    },
  },
});
