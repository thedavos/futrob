import {
  assignOrganizationPlanRequestSchema,
  assignOrganizationPlanResponseSchema,
  getOrganizationEntitlementsResponseSchema,
  getOrganizationPlanResponseSchema,
  listPublicPlansResponseSchema,
  type AssignOrganizationPlanRequest,
  type AssignOrganizationPlanResponse,
  type GetOrganizationEntitlementsResponse,
  type GetOrganizationPlanResponse,
  type ListPublicPlansResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/** Codes that mean "the plan does not include this" (HTTP 402, ADR-0025). */
export const PLAN_GATED_ERROR_CODES = [
  "billing.quota_exhausted",
  "billing.feature_not_in_plan",
  "competitions.plan_limit_reached",
  "competitions.format_not_in_plan",
  "organizations.staff_limit_reached",
  "game_data.sync_quota_exhausted",
  "statistics.performance_ranking_not_in_plan",
  "analytics.premium_not_in_plan",
] as const;

export type PlanGatedErrorCode = (typeof PLAN_GATED_ERROR_CODES)[number];

export function isPlanGatedErrorCode(code: string): code is PlanGatedErrorCode {
  return PLAN_GATED_ERROR_CODES.some((gated) => gated === code);
}

export function createBillingResource(http: HttpClient) {
  return {
    /** Anonymous pricing catalog; works on a client without `getAccessToken`. */
    async listPublicPlans(options: RequestOptions = {}): Promise<ListPublicPlansResponse> {
      return http.request({
        path: apiPath("public", "plans"),
        method: "GET",
        options,
        parse: (data) => listPublicPlansResponseSchema.parse(data),
      });
    },
    async getOrganizationPlan(
      organizationId: string,
      options: RequestOptions = {},
    ): Promise<GetOrganizationPlanResponse> {
      return http.request({
        path: apiPath("organizations", organizationId, "billing", "plan"),
        method: "GET",
        options,
        parse: (data) => getOrganizationPlanResponseSchema.parse(data),
      });
    },
    async getOrganizationEntitlements(
      organizationId: string,
      options: RequestOptions = {},
    ): Promise<GetOrganizationEntitlementsResponse> {
      return http.request({
        path: apiPath("organizations", organizationId, "billing", "entitlements"),
        method: "GET",
        options,
        parse: (data) => getOrganizationEntitlementsResponseSchema.parse(data),
      });
    },
    /** Platform superuser only; every change is audited. */
    async assignOrganizationPlan(
      organizationId: string,
      input: AssignOrganizationPlanRequest,
      options: RequestOptions = {},
    ): Promise<AssignOrganizationPlanResponse> {
      return http.request({
        path: apiPath("organizations", organizationId, "billing", "plan"),
        method: "PUT",
        body: assignOrganizationPlanRequestSchema.parse(input),
        options,
        parse: (data) => assignOrganizationPlanResponseSchema.parse(data),
      });
    },
  };
}

export type BillingResource = ReturnType<typeof createBillingResource>;
