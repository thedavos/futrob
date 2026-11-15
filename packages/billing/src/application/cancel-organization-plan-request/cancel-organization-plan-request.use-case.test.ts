import { describe, expect, it } from "vite-plus/test";
import { BILLING_PERMISSION } from "../../domain/policies/billing-permissions.ts";
import { createBillingHarness, ORG, ORGANIZER, STAFF } from "../billing.test-support.ts";
import { RequestOrganizationPlanUseCase } from "../request-organization-plan/request-organization-plan.use-case.ts";
import { CancelOrganizationPlanRequestUseCase } from "./cancel-organization-plan-request.use-case.ts";

function setup() {
  const harness = createBillingHarness();
  harness.allow(ORGANIZER, BILLING_PERMISSION.plansRequest);
  return {
    harness,
    request: new RequestOrganizationPlanUseCase(harness),
    cancel: new CancelOrganizationPlanRequestUseCase(harness),
  };
}

describe("CancelOrganizationPlanRequestUseCase", () => {
  it("cancels the pending request so a new one can start", async () => {
    const { harness, request, cancel } = setup();
    await request.execute({ actorId: ORGANIZER, organizationId: ORG, planKey: "pro" });

    const result = await cancel.execute({ actorId: ORGANIZER, organizationId: ORG });

    expect(result.isOk()).toBe(true);
    expect(await harness.requests.findPendingForOrganization(ORG)).toBeNull();
    expect(harness.planRequests()[0]).toMatchObject({
      status: "canceled",
      resolvedAt: harness.clock.now(),
    });
  });

  it("succeeds quietly when nothing is pending", async () => {
    const { cancel } = setup();

    const result = await cancel.execute({ actorId: ORGANIZER, organizationId: ORG });

    expect(result.isOk()).toBe(true);
  });

  it("refuses an actor without the request capability and leaves the request pending", async () => {
    const { harness, request, cancel } = setup();
    await request.execute({ actorId: ORGANIZER, organizationId: ORG, planKey: "pro" });

    const result = await cancel.execute({ actorId: STAFF, organizationId: ORG });

    expect(!result.isOk() && result.error.code).toBe("billing.forbidden");
    expect(await harness.requests.findPendingForOrganization(ORG)).not.toBeNull();
  });
});
