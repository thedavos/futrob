import { describe, expect, it } from "vite-plus/test";
import { BILLING_PERMISSION } from "../../domain/policies/billing-permissions.ts";
import {
  createBillingHarness,
  ORG,
  ORGANIZER,
  OTHER_ORG,
  SUPERUSER,
} from "../billing.test-support.ts";
import { RequestOrganizationPlanUseCase } from "../request-organization-plan/request-organization-plan.use-case.ts";
import { ListPendingPlanRequestsUseCase } from "./list-pending-plan-requests.use-case.ts";

describe("ListPendingPlanRequestsUseCase", () => {
  it("lets the superuser read pending requests across organizations", async () => {
    const harness = createBillingHarness();
    harness.allow(ORGANIZER, BILLING_PERMISSION.plansRequest);
    harness.allow(SUPERUSER, BILLING_PERMISSION.plansAssign);
    const request = new RequestOrganizationPlanUseCase(harness);
    await request.execute({ actorId: ORGANIZER, organizationId: ORG, planKey: "pro" });
    await request.execute({ actorId: ORGANIZER, organizationId: OTHER_ORG, planKey: "league" });

    const result = await new ListPendingPlanRequestsUseCase(harness).execute({
      actorId: SUPERUSER,
    });

    expect(result.isOk() && result.value.map((r) => r.organizationId)).toEqual([ORG, OTHER_ORG]);
  });

  it("refuses an organizer", async () => {
    const harness = createBillingHarness();
    harness.allow(ORGANIZER, BILLING_PERMISSION.plansRequest);

    const result = await new ListPendingPlanRequestsUseCase(harness).execute({
      actorId: ORGANIZER,
    });

    expect(!result.isOk() && result.error.code).toBe("billing.forbidden");
  });
});
