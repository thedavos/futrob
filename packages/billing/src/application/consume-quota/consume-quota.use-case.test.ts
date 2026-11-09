import { describe, expect, it } from "vite-plus/test";
import { QuotaExhausted } from "../../domain/errors/billing.errors.ts";
import { createBillingHarness, ORG, OTHER_ORG } from "../billing.test-support.ts";
import { ReleaseOrganizationQuotaUseCase } from "./consume-quota.use-case.ts";

const quota = "provider_sync_jobs" as const;

describe("ConsumeOrganizationQuotaUseCase", () => {
  it("rejects the job after the free monthly allowance with a stable code", async () => {
    const harness = createBillingHarness();
    for (let index = 0; index < 60; index++) {
      const result = await harness.consume.execute({
        organizationId: ORG,
        quota,
        usageKey: `job-${index}`,
      });
      expect(result.isOk()).toBe(true);
    }

    const rejected = await harness.consume.execute({
      organizationId: ORG,
      quota,
      usageKey: "job-60",
    });

    expect(rejected.isOk()).toBe(false);
    if (rejected.isOk()) return;
    expect(QuotaExhausted.is(rejected.error)).toBe(true);
    expect(rejected.error).toMatchObject({
      code: "billing.quota_exhausted",
      limit: 60,
      used: 60,
      periodKey: "2026-10",
      resetsAt: new Date("2026-11-01T00:00:00.000Z"),
    });
  });

  it("does not consume again for a replayed usage key, even when exhausted", async () => {
    const harness = createBillingHarness();
    for (let index = 0; index < 60; index++) {
      await harness.consume.execute({ organizationId: ORG, quota, usageKey: `job-${index}` });
    }

    const replay = await harness.consume.execute({ organizationId: ORG, quota, usageKey: "job-3" });

    expect(replay.isOk() && replay.value).toMatchObject({ outcome: "replayed", used: 60 });
  });

  it("keeps quotas per organization and restarts on the next UTC month", async () => {
    const harness = createBillingHarness(new Date("2026-10-31T23:59:59.000Z"));
    for (let index = 0; index < 60; index++) {
      await harness.consume.execute({ organizationId: ORG, quota, usageKey: `job-${index}` });
    }
    expect(
      (await harness.consume.execute({ organizationId: OTHER_ORG, quota, usageKey: "x" })).isOk(),
    ).toBe(true);

    harness.setNow(new Date("2026-11-01T00:00:00.000Z"));
    const next = await harness.consume.execute({ organizationId: ORG, quota, usageKey: "job-new" });

    expect(next.isOk() && next.value).toMatchObject({ outcome: "consumed", used: 1 });
  });

  it("returns released capacity", async () => {
    const harness = createBillingHarness();
    for (let index = 0; index < 60; index++) {
      await harness.consume.execute({ organizationId: ORG, quota, usageKey: `job-${index}` });
    }
    await new ReleaseOrganizationQuotaUseCase(harness.ledger).execute({
      organizationId: ORG,
      quota,
      usageKey: "job-0",
    });

    expect(
      (await harness.consume.execute({ organizationId: ORG, quota, usageKey: "job-60" })).isOk(),
    ).toBe(true);
  });

  it("uses the higher allowance once the organization is on Pro", async () => {
    const harness = createBillingHarness();
    await harness.subscriptions.save({
      id: "sub-1",
      subject: { type: "organization", organizationId: ORG },
      planKey: "pro",
      state: { status: "active" },
      createdAt: harness.clock.now(),
      updatedAt: harness.clock.now(),
    });

    const result = await harness.consume.execute({ organizationId: ORG, quota, usageKey: "job-1" });

    expect(result.isOk() && result.value.limit).toBe(600);
  });
});
