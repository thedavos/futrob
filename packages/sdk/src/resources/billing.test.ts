import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { FutrobApiError } from "../errors.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";
import { isPlanGatedErrorCode } from "./billing.ts";

const entitlements = {
  limits: { activeCompetitions: 1, teamsPerCompetition: 12, staffMembers: 2 },
  quotas: { provider_sync_jobs: { amount: 60, period: "calendar_month_utc", fairUse: false } },
  features: {
    competitionFormats: ["league", "knockout"],
    automaticProviderSync: false,
    priorityProviderSync: false,
    performanceRanking: false,
    premiumAnalytics: false,
    organizerAnalytics: "none",
    portalBranding: "futrob",
    notificationChannels: ["web"],
  },
};

describe("billing SDK resource", () => {
  it("reads the public catalog anonymously and assigns a plan with PUT", async () => {
    const requests: { url: string; method: string; authorization: string | null; body: unknown }[] =
      [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        const url = requestUrl(input);
        requests.push({
          url,
          method: init?.method ?? "GET",
          authorization: new Headers(init?.headers).get("authorization"),
          body: init?.body ? JSON.parse(String(init.body)) : null,
        });
        if (url.endsWith("/public/plans")) {
          return Response.json({ plans: [{ key: "free", version: 1, entitlements }] });
        }
        return Response.json({
          organizationId: "org 1",
          subscription: {
            planKey: "pro",
            state: { status: "active" },
            updatedAt: "2026-10-29T12:00:00.000Z",
          },
        });
      }),
    });

    const catalog = await client.billing.listPublicPlans();
    const assigned = await client.billing.assignOrganizationPlan("org 1", {
      planKey: "pro",
      state: { status: "active" },
      reason: "Acuerdo",
    });

    expect(catalog.plans[0]?.entitlements.limits.activeCompetitions).toBe(1);
    expect(assigned.subscription.planKey).toBe("pro");
    expect(requests).toEqual([
      {
        url: "https://app.example.com/api/v1/public/plans",
        method: "GET",
        authorization: null,
        body: null,
      },
      {
        url: "https://app.example.com/api/v1/organizations/org%201/billing/plan",
        method: "PUT",
        authorization: null,
        body: { planKey: "pro", state: { status: "active" }, reason: "Acuerdo" },
      },
    ]);
  });

  it("surfaces plan gating as a 402 FutrobApiError with a recognizable code", async () => {
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async () =>
        Response.json(
          {
            code: "game_data.sync_quota_exhausted",
            messageKey: "errors.game_data.sync_quota_exhausted",
          },
          { status: 402 },
        ),
      ),
    });

    const error = await client.billing.getOrganizationPlan("org-1").catch((caught) => caught);

    expect(error).toBeInstanceOf(FutrobApiError);
    expect(error).toMatchObject({ status: 402, code: "game_data.sync_quota_exhausted" });
    expect(isPlanGatedErrorCode(error.code)).toBe(true);
    expect(isPlanGatedErrorCode("authorization.forbidden")).toBe(false);
  });
});
