import { listOrganizationAuditQuerySchema } from "@futrob/api-contracts";
import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import { ListOrganizationAuditResponse } from "@/http/openapi/components.ts";

export const listOrganizationAuditRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/audit",
  operationId: "listOrganizationAudit",
  tags: ["organizations"],
  summary: "Read the organization's unified audit history",
  description:
    "Requires organizations.audit.read. Read-only, newest first by timestamp and stable ID. Filters apply before keyset pagination. Existing historical records retain unknown actors or reasons as null; no write, edit or delete operation is exposed.",
  params: pathParams(["organizationId"]),
  query: listOrganizationAuditQuerySchema,
  success: {
    status: 200,
    description: "Filtered audit entries and the next page cursor",
    schema: ListOrganizationAuditResponse,
  },
  errors: [400, 401, 403, 404],
});
