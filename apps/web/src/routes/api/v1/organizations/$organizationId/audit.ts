import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleListOrganizationAudit } from "@/modules/organizations/server/audit.handler.ts";

export const Route = createFileRoute("/api/v1/organizations/$organizationId/audit")({
  server: {
    handlers: {
      GET: handleAuditRequest,
      POST: handleAuditRequest,
      PUT: handleAuditRequest,
      PATCH: handleAuditRequest,
      DELETE: handleAuditRequest,
    },
  },
});

function handleAuditRequest({
  request,
  params,
}: {
  readonly request: Request;
  readonly params: { readonly organizationId: string };
}) {
  return handleListOrganizationAudit(
    request,
    params.organizationId,
    createAuthenticatedProductApiClient,
  );
}
