import type { ActorAddOnKey, OrganizationPlanKey } from "../value-objects/plan-key.ts";

/** A count limit; `null` means unlimited. */
export type PlanLimit = number | null;

export const QUOTA_KEYS = ["provider_sync_jobs"] as const;
export type QuotaKey = (typeof QUOTA_KEYS)[number];

export interface QuotaAllowance {
  /** Units per period; `null` means unlimited. */
  readonly amount: PlanLimit;
  readonly period: "calendar_month_utc";
  /** The amount is a fair-use ceiling rather than a sold allowance. */
  readonly fairUse: boolean;
}

export type OrganizerAnalyticsLevel = "none" | "basic" | "full";
export type PortalBranding = "futrob" | "logo_colors" | "advanced";
export type NotificationChannel = "web" | "email" | "announcements";

export interface OrganizationEntitlements {
  readonly limits: {
    readonly activeCompetitions: PlanLimit;
    readonly teamsPerCompetition: PlanLimit;
    readonly staffMembers: PlanLimit;
  };
  readonly quotas: Readonly<Record<QuotaKey, QuotaAllowance>>;
  readonly features: {
    /** Competition format identifiers the plan allows creating. */
    readonly competitionFormats: readonly string[];
    readonly automaticProviderSync: boolean;
    readonly priorityProviderSync: boolean;
    readonly performanceRanking: boolean;
    readonly premiumAnalytics: boolean;
    readonly organizerAnalytics: OrganizerAnalyticsLevel;
    readonly portalBranding: PortalBranding;
    readonly notificationChannels: readonly NotificationChannel[];
  };
}

/** Boolean features a consumer can gate on. */
export type OrganizationFeature = {
  [
    K in keyof OrganizationEntitlements["features"]
  ]: OrganizationEntitlements["features"][K] extends boolean ? K : never;
}[keyof OrganizationEntitlements["features"]];

export interface ActorEntitlements {
  readonly playerPremiumInsights: boolean;
}

export interface OrganizationPlan {
  readonly subject: "organization";
  readonly key: OrganizationPlanKey;
  /** Bumped whenever the catalog row changes. */
  readonly version: number;
  readonly entitlements: OrganizationEntitlements;
}

export interface ActorAddOnPlan {
  readonly subject: "actor";
  readonly key: ActorAddOnKey;
  readonly version: number;
  readonly entitlements: ActorEntitlements;
}

export type Plan = OrganizationPlan | ActorAddOnPlan;

/** What an actor without the add-on resolves to. */
export const NO_ACTOR_ENTITLEMENTS: ActorEntitlements = { playerPremiumInsights: false };
