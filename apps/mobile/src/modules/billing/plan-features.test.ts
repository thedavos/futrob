import { FutrobApiError } from "@futrob/sdk";
import { describe, expect, it, vi } from "vite-plus/test";
import { HIDDEN_PLAN_FEATURES, loadNativePlanFeatures } from "./plan-features.ts";

const entitlements = (performanceRanking: boolean) => ({
  organizationId: "org-1",
  planKey: performanceRanking ? ("pro" as const) : ("free" as const),
  entitlements: {
    limits: { activeCompetitions: 1, teamsPerCompetition: 12, staffMembers: 2 },
    quotas: {
      provider_sync_jobs: { amount: 60, period: "calendar_month_utc" as const, fairUse: false },
    },
    features: {
      competitionFormats: ["league"],
      automaticProviderSync: false,
      priorityProviderSync: false,
      performanceRanking,
      premiumAnalytics: performanceRanking,
      organizerAnalytics: "none" as const,
      portalBranding: "futrob" as const,
      notificationChannels: ["web" as const],
    },
  },
});

describe("native plan features", () => {
  it("shows premium sections only when the plan includes them", async () => {
    const client = {
      billing: { getOrganizationEntitlements: vi.fn(async () => entitlements(true)) },
    };

    expect(await loadNativePlanFeatures(client as never, "org-1")).toEqual({
      performanceRanking: true,
      premiumAnalytics: true,
    });
  });

  it("hides them on the free plan, without an organization and when the read fails", async () => {
    const free = {
      billing: { getOrganizationEntitlements: vi.fn(async () => entitlements(false)) },
    };
    const failing = {
      billing: {
        getOrganizationEntitlements: vi.fn(async () => {
          throw new FutrobApiError({
            status: 403,
            body: { code: "billing.forbidden", messageKey: "errors.billing.forbidden" },
          });
        }),
      },
    };

    expect(await loadNativePlanFeatures(free as never, "org-1")).toEqual(HIDDEN_PLAN_FEATURES);
    expect(await loadNativePlanFeatures(free as never, undefined)).toEqual(HIDDEN_PLAN_FEATURES);
    expect(await loadNativePlanFeatures(failing as never, "org-1")).toEqual(HIDDEN_PLAN_FEATURES);
    expect(free.billing.getOrganizationEntitlements).toHaveBeenCalledTimes(1);
  });
});
