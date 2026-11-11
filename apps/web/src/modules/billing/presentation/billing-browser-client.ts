import { z } from "zod";
import {
  assignOrganizationPlanResponseSchema,
  getOrganizationEntitlementsResponseSchema,
  getOrganizationPlanResponseSchema,
  listPlanRequestsResponseSchema,
  listPublicPlansResponseSchema,
  requestOrganizationPlanResponseSchema,
  type AssignOrganizationPlanRequest,
  type AssignOrganizationPlanResponse,
  type GetOrganizationEntitlementsResponse,
  type GetOrganizationPlanResponse,
  type ListPlanRequestsResponse,
  type ListPublicPlansResponse,
  type RequestOrganizationPlanRequest,
  type RequestOrganizationPlanResponse,
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

const noContentSchema = z.null().transform(() => undefined);

const organizationBillingPath = (
  organizationId: string,
  resource: "plan" | "entitlements" | "plan-request",
) => `/api/v1/organizations/${encodeURIComponent(organizationId)}/billing/${resource}`;

/** Same-origin BFF reads of the plan catalog and the organization's plan (session cookies). */
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
  /** Public catalog; needs no organization, so onboarding can read it. */
  listPublicPlans(): Promise<ListPublicPlansResponse> {
    return requestBrowserJson({
      path: "/api/v1/public/plans",
      method: "GET",
      schema: listPublicPlansResponseSchema,
      fallbackCode: "billing.plans_load_failed",
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
  /** Organizer: ask for a paid plan. The plan itself only changes when a superuser assigns it. */
  requestPlan(
    organizationId: string,
    input: RequestOrganizationPlanRequest,
  ): Promise<RequestOrganizationPlanResponse> {
    return requestBrowserJson({
      path: organizationBillingPath(organizationId, "plan-request"),
      method: "PUT",
      body: input,
      schema: requestOrganizationPlanResponseSchema,
      fallbackCode: "billing.plan_request_failed",
      createError: (status, error) => new BillingClientError(status, error.code),
    });
  },
  cancelPlanRequest(organizationId: string): Promise<void> {
    return requestBrowserJson({
      path: organizationBillingPath(organizationId, "plan-request"),
      method: "DELETE",
      schema: noContentSchema,
      fallbackCode: "billing.plan_request_cancel_failed",
      createError: (status, error) => new BillingClientError(status, error.code),
    });
  },
  /** Platform superuser only. */
  listPlanRequests(signal?: AbortSignal): Promise<ListPlanRequestsResponse> {
    return requestBrowserJson({
      path: "/api/v1/billing/plan-requests",
      method: "GET",
      signal,
      schema: listPlanRequestsResponseSchema,
      fallbackCode: "billing.plan_requests_load_failed",
      createError: (status, error) => new BillingClientError(status, error.code),
    });
  },
  /** Platform superuser only; the change is audited by the product API. */
  assignPlan(
    organizationId: string,
    input: AssignOrganizationPlanRequest,
  ): Promise<AssignOrganizationPlanResponse> {
    return requestBrowserJson({
      path: organizationBillingPath(organizationId, "plan"),
      method: "PUT",
      body: input,
      schema: assignOrganizationPlanResponseSchema,
      fallbackCode: "billing.plan_assign_failed",
      createError: (status, error) => new BillingClientError(status, error.code),
    });
  },
};
