import {
  getOrganizationEntitlementsResponseSchema,
  getOrganizationPlanResponseSchema,
  type GetOrganizationEntitlementsResponse,
  type GetOrganizationPlanResponse,
} from "@futrob/api-contracts";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";

export class BillingClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "BillingClientError";
  }
}

const organizationBillingPath = (organizationId: string, resource: "plan" | "entitlements") =>
  `/api/v1/organizations/${encodeURIComponent(organizationId)}/billing/${resource}`;

/** Same-origin BFF reads of the organization's plan (session cookies). */
export const billingBrowserClient = {
  getPlan(organizationId: string): Promise<GetOrganizationPlanResponse> {
    return requestBrowserJson({
      path: organizationBillingPath(organizationId, "plan"),
      method: "GET",
      schema: getOrganizationPlanResponseSchema,
      fallbackCode: "billing.plan_load_failed",
      createError: (status, error) => new BillingClientError(status, error.code),
    });
  },
  getEntitlements(organizationId: string): Promise<GetOrganizationEntitlementsResponse> {
    return requestBrowserJson({
      path: organizationBillingPath(organizationId, "entitlements"),
      method: "GET",
      schema: getOrganizationEntitlementsResponseSchema,
      fallbackCode: "billing.entitlements_load_failed",
      createError: (status, error) => new BillingClientError(status, error.code),
    });
  },
};
