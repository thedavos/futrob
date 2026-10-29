import { describe, expect, it } from "vite-plus/test";
import { BILLING_PERMISSION } from "../../domain/policies/billing-permissions.ts";
import { createBillingHarness, ORG, ORGANIZER, SUPERUSER } from "../billing.test-support.ts";
import { AssignOrganizationPlanUseCase } from "./assign-organization-plan.use-case.ts";

function setup() {
  const harness = createBillingHarness();
  harness.allow(SUPERUSER, BILLING_PERMISSION.plansAssign);
  return { harness, assign: new AssignOrganizationPlanUseCase(harness) };
}

describe("AssignOrganizationPlanUseCase", () => {
  it("assigns a plan and audits the change with before and after", async () => {
    const { harness, assign } = setup();

    await assign.execute({
      actorId: SUPERUSER,
      organizationId: ORG,
      planKey: "pro",
      state: { status: "active" },
      reason: "Acuerdo comercial",
    });
    const result = await assign.execute({
      actorId: SUPERUSER,
      organizationId: ORG,
      planKey: "pro",
      state: { status: "canceled" },
      reason: "Baja",
    });

    expect(result.isOk() && result.value.state).toEqual({
      status: "canceled",
      canceledAt: harness.clock.now(),
    });
    expect(harness.auditEntries).toHaveLength(2);
    expect(harness.auditEntries[0]).toMatchObject({ before: null, after: { planKey: "pro" } });
    expect(harness.auditEntries[1]).toMatchObject({
      changedByActorId: SUPERUSER,
      before: { planKey: "pro", state: { status: "active" } },
      after: { state: { status: "canceled" } },
      reason: "Baja",
    });
    expect((await harness.resolve.execute(ORG)).plan.key).toBe("free");
  });

  it("refuses an organizer without the platform capability", async () => {
    const { harness, assign } = setup();

    const result = await assign.execute({
      actorId: ORGANIZER,
      organizationId: ORG,
      planKey: "league",
      state: { status: "active" },
      reason: "Upgrade",
    });

    expect(!result.isOk() && result.error.code).toBe("billing.forbidden");
    expect(harness.auditEntries).toHaveLength(0);
  });

  it("rejects a trial that already ended and an empty reason", async () => {
    const { assign } = setup();
    const base = { actorId: SUPERUSER, organizationId: ORG, planKey: "pro" as const };

    const pastTrial = await assign.execute({
      ...base,
      state: { status: "trialing", trialEndsAt: new Date("2026-10-01") },
      reason: "Trial",
    });
    const noReason = await assign.execute({ ...base, state: { status: "active" }, reason: "  " });

    expect(!pastTrial.isOk() && pastTrial.error.code).toBe("billing.invalid_subscription");
    expect(!noReason.isOk() && noReason.error.code).toBe("billing.invalid_subscription");
  });
});
