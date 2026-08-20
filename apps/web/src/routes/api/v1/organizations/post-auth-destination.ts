import { createFileRoute } from "@tanstack/react-router";
import { resolvePostAuthDestinationResponseSchema } from "@futrob/api-contracts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import {
  createAuthenticatedOrganizationsClient,
  organizationsBffErrorResponse,
} from "@/modules/organizations/server/create-authenticated-organizations-client.ts";
import { productApiBffErrorResponse } from "@/context/product-api-bff-error-response.ts";

export const Route = createFileRoute("/api/v1/organizations/post-auth-destination")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { client } = await createAuthenticatedOrganizationsClient(request);
          const body = resolvePostAuthDestinationResponseSchema.parse(
            await client.organizations.resolvePostAuthDestination(),
          );
          return jsonResponse(body);
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
