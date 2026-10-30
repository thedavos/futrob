import type { ActorAddOnPlan, OrganizationPlan } from "../entities/plan.ts";

const MVP_COMPETITION_FORMATS = ["league", "knockout", "groups-knockout", "league-playoffs"];

/**
 * Seed catalog. Postgres stores the authoritative copy in `billing_plans`; this value
 * backs the in-memory adapter and the migration seed test. Sync amounts are cost hypotheses.
 */
export const DEFAULT_ORGANIZATION_PLANS: readonly OrganizationPlan[] = [
  {
    subject: "organization",
    key: "free",
    version: 1,
    entitlements: {
      limits: { activeCompetitions: 1, teamsPerCompetition: 12, staffMembers: 2 },
      quotas: {
        provider_sync_jobs: { amount: 60, period: "calendar_month_utc", fairUse: false },
      },
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
    },
  },
  {
    subject: "organization",
    key: "pro",
    version: 1,
    entitlements: {
      limits: { activeCompetitions: 5, teamsPerCompetition: 32, staffMembers: 10 },
      quotas: {
        provider_sync_jobs: { amount: 600, period: "calendar_month_utc", fairUse: false },
      },
      features: {
        competitionFormats: MVP_COMPETITION_FORMATS,
        automaticProviderSync: true,
        priorityProviderSync: false,
        performanceRanking: true,
        premiumAnalytics: true,
        organizerAnalytics: "basic",
        portalBranding: "logo_colors",
        notificationChannels: ["web", "email"],
      },
    },
  },
  {
    subject: "organization",
    key: "league",
    version: 1,
    entitlements: {
      limits: { activeCompetitions: null, teamsPerCompetition: null, staffMembers: null },
      quotas: {
        provider_sync_jobs: { amount: 5000, period: "calendar_month_utc", fairUse: true },
      },
      features: {
        competitionFormats: MVP_COMPETITION_FORMATS,
        automaticProviderSync: true,
        priorityProviderSync: true,
        performanceRanking: true,
        premiumAnalytics: true,
        organizerAnalytics: "full",
        portalBranding: "advanced",
        notificationChannels: ["web", "email", "announcements"],
      },
    },
  },
];

export const DEFAULT_ACTOR_ADD_ONS: readonly ActorAddOnPlan[] = [
  {
    subject: "actor",
    key: "player_premium",
    version: 1,
    entitlements: { playerPremiumInsights: true },
  },
];
