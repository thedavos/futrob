import { describe, expect, it } from "vite-plus/test";
import { BILLING_PERMISSION } from "../../domain/policies/billing-permissions.ts";
import {
  createBillingHarness,
  ORG,
  ORGANIZER,
  OTHER_ORG,
  STAFF,
  SUPERUSER,
} from "../billing.test-support.ts";
import { AssignOrganizationPlanUseCase } from "../assign-organization-plan/assign-organization-plan.use-case.ts";
import { RequestOrganizationPlanUseCase } from "./request-organization-plan.use-case.ts";

function setup() {
  const harness = createBillingHarness();
  harness.allow(ORGANIZER, BILLING_PERMISSION.plansRequest);
  harness.allow(SUPERUSER, BILLING_PERMISSION.plansAssign);
  return {
    harness,
    request: new RequestOrganizationPlanUseCase(harness),
    assign: new AssignOrganizationPlanUseCase(harness),
  };
}

describe("RequestOrganizationPlanUseCase", () => {
  it("records a pending request for a paid plan without changing the plan", async () => {
    const { harness, request } = setup();

    const result = await request.execute({
      actorId: ORGANIZER,
      organizationId: ORG,
      planKey: "pro",
    });

    expect(result.isOk() && result.value).toMatchObject({
      organizationId: ORG,
      planKey: "pro",
      requestedByActorId: ORGANIZER,
      status: "pending",
      resolvedAt: null,
    });
    expect((await harness.resolve.execute(ORG)).plan.key).toBe("free");
    expect(harness.auditEntries).toHaveLength(0);
  });

  it("refuses an actor without the request capability, such as staff", async () => {
    const { harness, request } = setup();

    const result = await request.execute({ actorId: STAFF, organizationId: ORG, planKey: "pro" });

    expect(!result.isOk() && result.error.code).toBe("billing.forbidden");
    expect(harness.planRequests()).toHaveLength(0);
  });

  it("refuses the free plan and the plan the organization already has", async () => {
    const { request, assign } = setup();
    await assign.execute({
      actorId: SUPERUSER,
      organizationId: ORG,
      planKey: "pro",
      state: { status: "active" },
      reason: "Pagado",
    });

    const free = await request.execute({
      actorId: ORGANIZER,
      organizationId: ORG,
      planKey: "free",
    });
    const same = await request.execute({ actorId: ORGANIZER, organizationId: ORG, planKey: "pro" });

    expect(!free.isOk() && free.error.code).toBe("billing.invalid_plan_request");
    expect(!same.isOk() && same.error.code).toBe("billing.invalid_plan_request");
  });

  it("returns the pending request on a repeat and supersedes it when the plan differs", async () => {
    const { harness, request } = setup();
    const first = await request.execute({
      actorId: ORGANIZER,
      organizationId: ORG,
      planKey: "pro",
    });
    const repeat = await request.execute({
      actorId: ORGANIZER,
      organizationId: ORG,
      planKey: "pro",
    });
    const changed = await request.execute({
      actorId: ORGANIZER,
      organizationId: ORG,
      planKey: "league",
    });

    expect(repeat.isOk() && first.isOk() && repeat.value.id).toBe(first.isOk() && first.value.id);
    expect(changed.isOk() && changed.value.planKey).toBe("league");
    const pending = harness.planRequests().filter((r) => r.status === "pending");
    expect(pending).toHaveLength(1);
    expect(harness.planRequests().filter((r) => r.status === "canceled")).toHaveLength(1);
  });

  it("keeps requests of different organizations apart", async () => {
    const { harness, request } = setup();
    harness.allow(ORGANIZER, BILLING_PERMISSION.plansRequest);

    await request.execute({ actorId: ORGANIZER, organizationId: ORG, planKey: "pro" });
    await request.execute({ actorId: ORGANIZER, organizationId: OTHER_ORG, planKey: "league" });

    expect(await harness.requests.findPendingForOrganization(ORG)).toMatchObject({
      planKey: "pro",
    });
    expect(await harness.requests.findPendingForOrganization(OTHER_ORG)).toMatchObject({
      planKey: "league",
    });
  });

  it("marks the request fulfilled when a superuser assigns that plan", async () => {
    const { harness, request, assign } = setup();
    await request.execute({ actorId: ORGANIZER, organizationId: ORG, planKey: "pro" });
    harness.setNow(new Date("2026-10-16T09:00:00.000Z"));

    await assign.execute({
      actorId: SUPERUSER,
      organizationId: ORG,
      planKey: "pro",
      state: { status: "active" },
      reason: "Pago recibido",
    });

    expect(await harness.requests.findPendingForOrganization(ORG)).toBeNull();
    expect(harness.planRequests()[0]).toMatchObject({
      status: "fulfilled",
      resolvedAt: new Date("2026-10-16T09:00:00.000Z"),
    });
  });

  it("leaves the request pending when the assigned plan is another one or is canceled", async () => {
    const { harness, request, assign } = setup();
    await request.execute({ actorId: ORGANIZER, organizationId: ORG, planKey: "league" });

    await assign.execute({
      actorId: SUPERUSER,
      organizationId: ORG,
      planKey: "pro",
      state: { status: "active" },
      reason: "Otro plan",
    });
    await assign.execute({
      actorId: SUPERUSER,
      organizationId: ORG,
      planKey: "league",
      state: { status: "canceled" },
      reason: "Baja",
    });

    expect(await harness.requests.findPendingForOrganization(ORG)).toMatchObject({
      planKey: "league",
    });
  });
});
