import type { GetOrganizationPlanResponse } from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { nextPlan, planStatus, usageLevel, usageRows } from "./organization-plan-model.ts";
import { freePlanFixture } from "./organization-plan.fixtures.ts";

describe("organization plan model", () => {
  it("rates usage against limits, with unlimited kept apart", () => {
    expect(usageLevel(0, 1)).toBe("ok");
    expect(usageLevel(48, 60)).toBe("near");
    expect(usageLevel(60, 60)).toBe("reached");
    expect(usageLevel(3, null)).toBe("unlimited");
  });

  it("builds the three usage rows from the plan read", () => {
    const plan: GetOrganizationPlanResponse = {
      ...freePlanFixture,
      usage: { activeCompetitions: 1, staffMembers: 1 },
      quotas: [{ ...freePlanFixture.quotas[0]!, used: 60 }],
    };

    expect(usageRows(plan).map(({ id, level, percent }) => [id, level, percent])).toEqual([
      ["activeCompetitions", "reached", 100],
      ["staffMembers", "ok", 50],
      ["providerSyncJobs", "reached", 100],
    ]);
  });

  it("names the next plan and reads a lapsed subscription as free", () => {
    expect([nextPlan("free"), nextPlan("pro"), nextPlan("league")]).toEqual([
      "pro",
      "league",
      null,
    ]);
    expect(planStatus(freePlanFixture)).toEqual({ kind: "default" });
    expect(
      planStatus({
        ...freePlanFixture,
        subscription: {
          planKey: "pro",
          state: { status: "canceled", canceledAt: "2026-10-01T00:00:00.000Z" },
          updatedAt: "2026-10-01T00:00:00.000Z",
        },
      }),
    ).toEqual({ kind: "lapsed", planKey: "pro" });
  });
});
