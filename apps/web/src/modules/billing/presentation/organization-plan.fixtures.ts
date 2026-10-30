import type { GetOrganizationPlanResponse, OrganizationEntitlements } from "@futrob/api-contracts";

const MVP_FORMATS = ["league", "knockout", "groups-knockout", "league-playoffs"];

export const freeEntitlementsFixture: OrganizationEntitlements = {
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

export const proEntitlementsFixture: OrganizationEntitlements = {
  limits: { activeCompetitions: 5, teamsPerCompetition: 32, staffMembers: 10 },
  quotas: { provider_sync_jobs: { amount: 600, period: "calendar_month_utc", fairUse: false } },
  features: {
    competitionFormats: MVP_FORMATS,
    automaticProviderSync: true,
    priorityProviderSync: false,
    performanceRanking: true,
    premiumAnalytics: true,
    organizerAnalytics: "basic",
    portalBranding: "logo_colors",
    notificationChannels: ["web", "email"],
  },
};

export const leagueEntitlementsFixture: OrganizationEntitlements = {
  limits: { activeCompetitions: null, teamsPerCompetition: null, staffMembers: null },
  quotas: { provider_sync_jobs: { amount: 5000, period: "calendar_month_utc", fairUse: true } },
  features: {
    ...proEntitlementsFixture.features,
    priorityProviderSync: true,
    organizerAnalytics: "full",
    portalBranding: "advanced",
    notificationChannels: ["web", "email", "announcements"],
  },
};

/** Demo data for stories and tests only; the page never invents a plan. */
export const freePlanFixture: GetOrganizationPlanResponse = {
  organizationId: "org-demo",
  plan: { key: "free", version: 1, entitlements: freeEntitlementsFixture },
  source: "fallback",
  subscription: null,
  quotas: [
    {
      quota: "provider_sync_jobs",
      used: 12,
      limit: 60,
      fairUse: false,
      periodKey: "2026-10",
      resetsAt: "2026-11-01T00:00:00.000Z",
    },
  ],
  usage: { activeCompetitions: 1, staffMembers: 1 },
  recentChanges: [],
};

export const proPlanFixture: GetOrganizationPlanResponse = {
  ...freePlanFixture,
  plan: { key: "pro", version: 1, entitlements: proEntitlementsFixture },
  source: "subscription",
  subscription: {
    planKey: "pro",
    state: { status: "active" },
    updatedAt: "2026-10-20T15:00:00.000Z",
  },
  quotas: [{ ...freePlanFixture.quotas[0]!, used: 61, limit: 600 }],
  usage: { activeCompetitions: 2, staffMembers: 3 },
  recentChanges: [
    {
      id: "change-1",
      changedByActorId: "superuser",
      before: null,
      after: { planKey: "pro", state: { status: "active" } },
      reason: "Acuerdo comercial",
      occurredAt: "2026-10-20T15:00:00.000Z",
    },
  ],
};
