import { listOrganizationAuditResponseSchema } from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";
export const ListOrganizationAuditResponse = namedSchema(
  "ListOrganizationAuditResponse",
  listOrganizationAuditResponseSchema,
);
