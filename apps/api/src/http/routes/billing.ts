import type { Hono } from "hono";
import {
  assignOrganizationPlanResponseSchema,
  getOrganizationEntitlementsResponseSchema,
  getOrganizationPlanResponseSchema,
  listPublicPlansResponseSchema,
} from "@futrob/api-contracts";
import type { OrganizationSubscription, RequestedSubscriptionState } from "@futrob/billing";
import { asOrganizationId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { organizationPlanDto, subscriptionDto } from "@/http/mappers/billing.ts";
import { createOpenApiRouter, createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  assignOrganizationPlanRoute,
  getOrganizationEntitlementsRoute,
  getOrganizationPlanRoute,
  listPublicPlansRoute,
} from "@/http/openapi/routes/billing.ts";
import { jsonResponse, publicJsonResponse } from "@/utils/http-response.ts";

/** Anonymous pricing catalog; registered beside the public portal, before service auth. */
export function registerPublicBillingRoutes(app: Hono, deps: AppDeps): void {
  const anonymous = createOpenApiRouter();
  anonymous.openapi(listPublicPlansRoute, async () => {
    const plans = await deps.modules.billing.useCases.listPlans.execute();
    return publicJsonResponse(
      listPublicPlansResponseSchema.parse({
        plans: plans.map(({ key, version, entitlements }) => ({ key, version, entitlements })),
      }),
    );
  });
  app.route("/", anonymous);
}

export function registerBillingRoutes(app: Hono, deps: AppDeps): void {
  const { billing } = deps.modules;
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(getOrganizationPlanRoute, async (c) => {
    const result = await billing.planUsage.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(c.req.valid("param").organizationId),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(getOrganizationPlanResponseSchema.parse(organizationPlanDto(result.value)));
  });

  secured.openapi(getOrganizationEntitlementsRoute, async (c) => {
    const result = await billing.useCases.getOrganizationEntitlements.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(c.req.valid("param").organizationId),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(getOrganizationEntitlementsResponseSchema.parse(result.value));
  });

  secured.openapi(assignOrganizationPlanRoute, async (c) => {
    const organizationId = asOrganizationId(c.req.valid("param").organizationId);
    const body = c.req.valid("json");
    const state: RequestedSubscriptionState =
      body.state.status === "trialing"
        ? { status: "trialing", trialEndsAt: new Date(body.state.trialEndsAt) }
        : body.state;
    const result = await billing.useCases.assignOrganizationPlan.execute({
      actorId: c.get("actorId"),
      organizationId,
      planKey: body.planKey,
      state,
      reason: body.reason,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(assignedDto(organizationId, result.value));
  });

  app.route("/", secured);
}

function assignedDto(organizationId: string, subscription: OrganizationSubscription) {
  return assignOrganizationPlanResponseSchema.parse({
    organizationId,
    subscription: subscriptionDto(subscription),
  });
}
