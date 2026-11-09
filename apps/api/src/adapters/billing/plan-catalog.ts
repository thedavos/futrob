import {
  DEFAULT_ACTOR_ADD_ONS,
  DEFAULT_ORGANIZATION_PLANS,
  isActorAddOnKey,
  isOrganizationPlanKey,
  ORGANIZATION_PLAN_KEYS,
  type ActorAddOnPlan,
  type OrganizationPlan,
  type PlanCatalogPort,
} from "@futrob/billing";
import type { Pool } from "pg";
import { z } from "zod";
import { parseJsonColumn } from "@/adapters/persistence/parse-json-column.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const limitSchema = z.number().int().nonnegative().nullable();

const organizationEntitlementsSchema = z.object({
  limits: z.object({
    activeCompetitions: limitSchema,
    teamsPerCompetition: limitSchema,
    staffMembers: limitSchema,
  }),
  quotas: z.object({
    provider_sync_jobs: z.object({
      amount: limitSchema,
      period: z.literal("calendar_month_utc"),
      fairUse: z.boolean(),
    }),
  }),
  features: z.object({
    competitionFormats: z.array(z.string()),
    automaticProviderSync: z.boolean(),
    priorityProviderSync: z.boolean(),
    performanceRanking: z.boolean(),
    premiumAnalytics: z.boolean(),
    organizerAnalytics: z.enum(["none", "basic", "full"]),
    portalBranding: z.enum(["futrob", "logo_colors", "advanced"]),
    notificationChannels: z.array(z.enum(["web", "email", "announcements"])),
  }),
});

const actorEntitlementsSchema = z.object({ playerPremiumInsights: z.boolean() });

const planRowSchema = z.object({
  key: z.string(),
  subject_type: z.enum(["organization", "actor"]),
  version: z.number().int(),
  entitlements: z.unknown(),
});

type PlanRow = z.infer<typeof planRowSchema>;

function toOrganizationPlan(row: PlanRow): OrganizationPlan | null {
  if (row.subject_type !== "organization" || !isOrganizationPlanKey(row.key)) return null;
  return {
    subject: "organization",
    key: row.key,
    version: row.version,
    entitlements: parseJsonColumn(organizationEntitlementsSchema, row.entitlements),
  };
}

function toActorAddOn(row: PlanRow): ActorAddOnPlan | null {
  if (row.subject_type !== "actor" || !isActorAddOnKey(row.key)) return null;
  return {
    subject: "actor",
    key: row.key,
    version: row.version,
    entitlements: parseJsonColumn(actorEntitlementsSchema, row.entitlements),
  };
}

/** Reads the catalog per call so a data change applies without a restart. */
export class PostgresPlanCatalog implements PlanCatalogPort {
  constructor(private readonly pool: Pool) {}

  async findOrganizationPlan(key: OrganizationPlan["key"]) {
    const row = await this.findRow(key);
    return row ? toOrganizationPlan(row) : null;
  }

  async findActorAddOn(key: ActorAddOnPlan["key"]) {
    const row = await this.findRow(key);
    return row ? toActorAddOn(row) : null;
  }

  async listOrganizationPlans() {
    const result = await getPgExecutor(this.pool).query(
      `SELECT key, subject_type, version, entitlements FROM billing_plans
       WHERE subject_type = 'organization'`,
    );
    const plans = result.rows
      .map((row) => toOrganizationPlan(planRowSchema.parse(row)))
      .filter((plan): plan is OrganizationPlan => plan !== null);
    return sortByUpgradeOrder(plans);
  }

  private async findRow(key: string): Promise<PlanRow | null> {
    const result = await getPgExecutor(this.pool).query(
      "SELECT key, subject_type, version, entitlements FROM billing_plans WHERE key = $1",
      [key],
    );
    return result.rows[0] ? planRowSchema.parse(result.rows[0]) : null;
  }
}

export class InMemoryPlanCatalog implements PlanCatalogPort {
  constructor(
    private readonly organizationPlans: readonly OrganizationPlan[] = DEFAULT_ORGANIZATION_PLANS,
    private readonly addOns: readonly ActorAddOnPlan[] = DEFAULT_ACTOR_ADD_ONS,
  ) {}

  async findOrganizationPlan(key: OrganizationPlan["key"]) {
    return this.organizationPlans.find((plan) => plan.key === key) ?? null;
  }

  async findActorAddOn(key: ActorAddOnPlan["key"]) {
    return this.addOns.find((plan) => plan.key === key) ?? null;
  }

  async listOrganizationPlans() {
    return sortByUpgradeOrder(this.organizationPlans);
  }
}

function sortByUpgradeOrder(plans: readonly OrganizationPlan[]): readonly OrganizationPlan[] {
  return [...plans].sort(
    (a, b) => ORGANIZATION_PLAN_KEYS.indexOf(a.key) - ORGANIZATION_PLAN_KEYS.indexOf(b.key),
  );
}
