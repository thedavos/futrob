import {
  assignOrganizationPlanRequestSchema,
  assignOrganizationPlanResponseSchema,
  getOrganizationEntitlementsResponseSchema,
  getOrganizationPlanResponseSchema,
  listPublicPlansResponseSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const GetOrganizationPlanResponse = namedSchema(
  "GetOrganizationPlanResponse",
  getOrganizationPlanResponseSchema,
);
export const GetOrganizationEntitlementsResponse = namedSchema(
  "GetOrganizationEntitlementsResponse",
  getOrganizationEntitlementsResponseSchema,
);
export const AssignOrganizationPlanRequest = namedSchema(
  "AssignOrganizationPlanRequest",
  assignOrganizationPlanRequestSchema,
);
export const AssignOrganizationPlanResponse = namedSchema(
  "AssignOrganizationPlanResponse",
  assignOrganizationPlanResponseSchema,
);
export const ListPublicPlansResponse = namedSchema(
  "ListPublicPlansResponse",
  listPublicPlansResponseSchema,
);
