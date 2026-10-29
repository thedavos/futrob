import { describe, expect, it } from "vite-plus/test";
import { BILLING_PERMISSION } from "../../domain/policies/billing-permissions.ts";
import { createBillingHarness, ORG, ORGANIZER } from "../billing.test-support.ts";
import {
  GetOrganizationEntitlementsUseCase,
  GetOrganizationPlanUseCase,
} from "./get-organization-plan.use-case.ts";

describe("GetOrganizationPlanUseCase", () => {
  it("returns the plan with this month's quota usage", async () => {
    const harness = createBillingHarness();
    harness.allow(ORGANIZER, BILLING_PERMISSION.read);
    await harness.consume.execute({
      organizationId: ORG,
      quota: "provider_sync_jobs",
      usageKey: "job-1",
    });

    const result = await new GetOrganizationPlanUseCase(harness).execute({
      actorId: ORGANIZER,
      organizationId: ORG,
    });

    expect(result.isOk() && result.value).toMatchObject({
      plan: { key: "free" },
      quotas: [{ quota: "provider_sync_jobs", used: 1, limit: 60, period: { key: "2026-10" } }],
      recentChanges: [],
    });
  });

  it("denies readers without billing.read", async () => {
    const harness = createBillingHarness();

    const result = await new GetOrganizationPlanUseCase(harness).execute({
      actorId: ORGANIZER,
      organizationId: ORG,
    });

    expect(!result.isOk() && result.error.code).toBe("billing.forbidden");
  });
});

describe("GetOrganizationEntitlementsUseCase", () => {
  it("returns entitlements to members with the entitlement capability", async () => {
    const harness = createBillingHarness();
    harness.allow(ORGANIZER, BILLING_PERMISSION.entitlementsRead);

    const result = await new GetOrganizationEntitlementsUseCase(harness).execute({
      actorId: ORGANIZER,
      organizationId: ORG,
    });

    expect(result.isOk() && result.value.entitlements.features.performanceRanking).toBe(false);
  });
});
