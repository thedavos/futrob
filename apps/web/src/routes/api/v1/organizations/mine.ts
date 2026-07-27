import { createFileRoute } from "@tanstack/react-router";
import { listMyMembershipsResponseSchema } from "@futrob/api-contracts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import {
  createAuthenticatedOrganizationsClient,
  organizationsBffErrorResponse,
} from "@/modules/organizations/server/create-authenticated-organizations-client.ts";

export const Route = createFileRoute("/api/v1/organizations/mine")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { client } = await createAuthenticatedOrganizationsClient(request);
          const body = listMyMembershipsResponseSchema.parse(await client.organizations.listMine());
          return jsonResponse(body);
        } catch (error) {
          return organizationsBffErrorResponse(error);
        }
      },
    },
  },
});
