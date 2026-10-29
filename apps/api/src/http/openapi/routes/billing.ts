import {
  AssignOrganizationPlanRequest,
  AssignOrganizationPlanResponse,
  GetOrganizationEntitlementsResponse,
  GetOrganizationPlanResponse,
  ListPublicPlansResponse,
} from "@/http/openapi/components.ts";
import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";

export const listPublicPlansRoute = defineRoute({
  method: "get",
  path: "/public/plans",
  operationId: "listPublicPlans",
  tags: ["billing"],
  summary: "Read the organization plan catalog for the pricing page",
  description:
    "Anonymous. Limits, quotas and features come from the catalog data; `null` means unlimited.",
  public: true,
  success: { status: 200, description: "Plans in upgrade order", schema: ListPublicPlansResponse },
});

export const getOrganizationPlanRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/billing/plan",
  operationId: "getOrganizationPlan",
  tags: ["billing"],
  summary: "Read the organization's effective plan, quota usage and recent plan changes",
  params: pathParams(["organizationId"]),
  success: { status: 200, description: "Effective plan", schema: GetOrganizationPlanResponse },
  errors: [401, 403, 404],
});

export const getOrganizationEntitlementsRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/billing/entitlements",
  operationId: "getOrganizationEntitlements",
  tags: ["billing"],
  summary: "Read what the organization's plan includes, for hiding what does not apply",
  params: pathParams(["organizationId"]),
  success: {
    status: 200,
    description: "Entitlements of the effective plan",
    schema: GetOrganizationEntitlementsResponse,
  },
  errors: [401, 403, 404],
});

export const assignOrganizationPlanRoute = defineRoute({
  method: "put",
  path: "/organizations/{organizationId}/billing/plan",
  operationId: "assignOrganizationPlan",
  tags: ["billing"],
  summary: "Assign a plan by hand (platform superuser, Phase 0 without payments)",
  description: "Every change is audited with the previous and new plan and the reason.",
  params: pathParams(["organizationId"]),
  body: AssignOrganizationPlanRequest,
  success: {
    status: 200,
    description: "Stored subscription",
    schema: AssignOrganizationPlanResponse,
  },
  errors: [400, 401, 403, 404],
});
