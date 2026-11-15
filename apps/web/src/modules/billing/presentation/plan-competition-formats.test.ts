import type { OrganizationPlan } from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import {
  competitionFormatsOutsidePlan,
  STARTING_ORGANIZATION_PLAN,
} from "./plan-competition-formats.ts";

const ALL_FORMATS = ["league", "knockout", "groups-knockout", "league-playoffs", "swiss"] as const;

function plan(key: OrganizationPlan["key"], competitionFormats: string[]): OrganizationPlan {
  return {
    key,
    version: 1,
    entitlements: {
      limits: { activeCompetitions: 1, teamsPerCompetition: 12, staffMembers: 2 },
      quotas: { provider_sync_jobs: { amount: 60, period: "calendar_month_utc", fairUse: false } },
      features: {
        competitionFormats,
        automaticProviderSync: false,
        priorityProviderSync: false,
        performanceRanking: false,
        premiumAnalytics: false,
        organizerAnalytics: "none",
        portalBranding: "futrob",
        notificationChannels: ["web"],
      },
    },
  };
}

describe("competitionFormatsOutsidePlan", () => {
  it("starts new organizations on the Free plan", () => {
    expect(STARTING_ORGANIZATION_PLAN).toBe("free");
  });

  it("lists the formats the catalog leaves out of the plan", () => {
    const plans = [plan("free", ["league", "knockout"]), plan("pro", [...ALL_FORMATS])];

    expect([...competitionFormatsOutsidePlan(plans, "free", ALL_FORMATS)]).toEqual([
      "groups-knockout",
      "league-playoffs",
      "swiss",
    ]);
    expect(competitionFormatsOutsidePlan(plans, "pro", ALL_FORMATS).size).toBe(0);
  });

  it("gates nothing when the catalog is unknown", () => {
    expect(competitionFormatsOutsidePlan(null, "free", ALL_FORMATS).size).toBe(0);
    expect(competitionFormatsOutsidePlan([], "free", ALL_FORMATS).size).toBe(0);
  });
});
