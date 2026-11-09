import { z } from "zod";

/** Billing wire contract (ADR-0025). `null` limits and amounts mean unlimited. */
export const organizationPlanKeySchema = z.enum(["free", "pro", "league"]);
export type OrganizationPlanKey = z.infer<typeof organizationPlanKeySchema>;

const planLimitSchema = z.number().int().nonnegative().nullable();

export const organizationEntitlementsSchema = z
  .object({
    limits: z
      .object({
        activeCompetitions: planLimitSchema,
        teamsPerCompetition: planLimitSchema,
        staffMembers: planLimitSchema,
      })
      .strict(),
    quotas: z
      .object({
        provider_sync_jobs: z
          .object({
            amount: planLimitSchema,
            period: z.literal("calendar_month_utc"),
            fairUse: z.boolean(),
          })
          .strict(),
      })
      .strict(),
    features: z
      .object({
        competitionFormats: z.array(z.string()),
        automaticProviderSync: z.boolean(),
        priorityProviderSync: z.boolean(),
        performanceRanking: z.boolean(),
        premiumAnalytics: z.boolean(),
        organizerAnalytics: z.enum(["none", "basic", "full"]),
        portalBranding: z.enum(["futrob", "logo_colors", "advanced"]),
        notificationChannels: z.array(z.enum(["web", "email", "announcements"])),
      })
      .strict(),
  })
  .strict();
export type OrganizationEntitlements = z.infer<typeof organizationEntitlementsSchema>;

export const organizationPlanSchema = z
  .object({
    key: organizationPlanKeySchema,
    version: z.number().int().positive(),
    entitlements: organizationEntitlementsSchema,
  })
  .strict();
export type OrganizationPlan = z.infer<typeof organizationPlanSchema>;

export const subscriptionStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("active") }).strict(),
  z.object({ status: z.literal("trialing"), trialEndsAt: z.iso.datetime() }).strict(),
  z.object({ status: z.literal("past_due"), pastDueSince: z.iso.datetime() }).strict(),
  z.object({ status: z.literal("canceled"), canceledAt: z.iso.datetime() }).strict(),
]);
export type SubscriptionState = z.infer<typeof subscriptionStateSchema>;

export const organizationSubscriptionSchema = z
  .object({
    planKey: organizationPlanKeySchema,
    state: subscriptionStateSchema,
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const quotaUsageSchema = z
  .object({
    quota: z.literal("provider_sync_jobs"),
    used: z.number().int().nonnegative(),
    limit: planLimitSchema,
    fairUse: z.boolean(),
    periodKey: z.string().regex(/^\d{4}-\d{2}$/),
    resetsAt: z.iso.datetime(),
  })
  .strict();
export type QuotaUsage = z.infer<typeof quotaUsageSchema>;

const planChangeSnapshotSchema = z
  .object({ planKey: z.string(), state: subscriptionStateSchema })
  .strict();

export const planChangeSchema = z
  .object({
    id: z.string(),
    changedByActorId: z.string(),
    before: planChangeSnapshotSchema.nullable(),
    after: planChangeSnapshotSchema,
    reason: z.string(),
    occurredAt: z.iso.datetime(),
  })
  .strict();
export type PlanChange = z.infer<typeof planChangeSchema>;

export const getOrganizationPlanResponseSchema = z
  .object({
    organizationId: z.string(),
    plan: organizationPlanSchema,
    /** `fallback` when no live subscription grants a plan and free applies. */
    source: z.enum(["subscription", "fallback"]),
    subscription: organizationSubscriptionSchema.nullable(),
    quotas: z.array(quotaUsageSchema),
    /** Current counts against the plan's limits. */
    usage: z
      .object({
        activeCompetitions: z.number().int().nonnegative(),
        staffMembers: z.number().int().nonnegative(),
      })
      .strict(),
    recentChanges: z.array(planChangeSchema),
  })
  .strict();
export type GetOrganizationPlanResponse = z.infer<typeof getOrganizationPlanResponseSchema>;

export const getOrganizationEntitlementsResponseSchema = z
  .object({
    organizationId: z.string(),
    planKey: organizationPlanKeySchema,
    entitlements: organizationEntitlementsSchema,
  })
  .strict();
export type GetOrganizationEntitlementsResponse = z.infer<
  typeof getOrganizationEntitlementsResponseSchema
>;

export const requestedSubscriptionStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("active") }).strict(),
  z.object({ status: z.literal("trialing"), trialEndsAt: z.iso.datetime() }).strict(),
  z.object({ status: z.literal("past_due") }).strict(),
  z.object({ status: z.literal("canceled") }).strict(),
]);

export const assignOrganizationPlanRequestSchema = z
  .object({
    planKey: organizationPlanKeySchema,
    state: requestedSubscriptionStateSchema,
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export type AssignOrganizationPlanRequest = z.infer<typeof assignOrganizationPlanRequestSchema>;

export const assignOrganizationPlanResponseSchema = z
  .object({
    organizationId: z.string(),
    subscription: organizationSubscriptionSchema,
  })
  .strict();
export type AssignOrganizationPlanResponse = z.infer<typeof assignOrganizationPlanResponseSchema>;

export const listPublicPlansResponseSchema = z
  .object({ plans: z.array(organizationPlanSchema) })
  .strict();
export type ListPublicPlansResponse = z.infer<typeof listPublicPlansResponseSchema>;
