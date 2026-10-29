import { DEFAULT_ACTOR_ADD_ONS, DEFAULT_ORGANIZATION_PLANS } from "@futrob/billing";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import {
  billingAdapterContract,
  CONTRACT_ORG,
  CONTRACT_OTHER_ORG,
  CONTRACT_SUPERUSER,
} from "./billing-adapters.contract.ts";
import { PostgresPlanCatalog } from "./plan-catalog.ts";
import { PostgresQuotaLedger } from "./quota-ledger.ts";
import {
  PostgresPlanChangeAuditRepository,
  PostgresSubscriptionRepository,
} from "./subscriptions.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("Postgres billing adapters", () => {
  let isolated: IsolatedSchema;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl!, "billing");
    await migrateIsolatedSchema(isolated.pool);
  }, 60_000);
  afterAll(async () => {
    await isolated?.drop();
  });

  async function freshTenants() {
    await isolated.pool.query(
      "TRUNCATE billing_quota_consumptions, billing_plan_changes, billing_subscriptions",
    );
    await seedActors(isolated.pool, CONTRACT_SUPERUSER);
    await isolated.pool.query(
      `INSERT INTO organizations (id, name, normalized_name, slug, time_zone, created_at, created_by_actor_id)
       VALUES ($1, $1, $1, $1, 'UTC', NOW(), $3), ($2, $2, $2, $2, 'UTC', NOW(), $3)
       ON CONFLICT (id) DO NOTHING`,
      [CONTRACT_ORG, CONTRACT_OTHER_ORG, CONTRACT_SUPERUSER],
    );
    return {
      ledger: new PostgresQuotaLedger(isolated.pool),
      subscriptions: new PostgresSubscriptionRepository(isolated.pool),
      audit: new PostgresPlanChangeAuditRepository(isolated.pool),
    };
  }

  billingAdapterContract(freshTenants);

  it("seeds the catalog with the in-memory defaults", async () => {
    const catalog = new PostgresPlanCatalog(isolated.pool);

    expect(await catalog.listOrganizationPlans()).toEqual(DEFAULT_ORGANIZATION_PLANS);
    expect(await catalog.findActorAddOn("player_premium")).toEqual(DEFAULT_ACTOR_ADD_ONS[0]);
  });

  it("applies a catalog edit without code", async () => {
    const catalog = new PostgresPlanCatalog(isolated.pool);
    await isolated.pool.query(
      `UPDATE billing_plans
       SET entitlements = jsonb_set(entitlements, '{quotas,provider_sync_jobs,amount}', '75'),
           version = version + 1
       WHERE key = 'free'`,
    );
    try {
      const free = await catalog.findOrganizationPlan("free");
      expect(free?.version).toBe(2);
      expect(free?.entitlements.quotas.provider_sync_jobs.amount).toBe(75);
    } finally {
      await isolated.pool.query(
        `UPDATE billing_plans
         SET entitlements = jsonb_set(entitlements, '{quotas,provider_sync_jobs,amount}', '60'),
             version = 1
         WHERE key = 'free'`,
      );
    }
  });

  it("rejects an add-on on an organization and a subscription for an unknown organization", async () => {
    await freshTenants();
    const insert = (organizationId: string, planKey: string) =>
      isolated.pool.query(
        `INSERT INTO billing_subscriptions (id, subject_type, organization_id, plan_key, status, created_at, updated_at)
         VALUES (gen_random_uuid()::text, 'organization', $1, $2, 'active', NOW(), NOW())`,
        [organizationId, planKey],
      );

    await expect(insert(CONTRACT_ORG, "player_premium")).rejects.toThrow(/foreign key/);
    await expect(insert("missing-org", "pro")).rejects.toThrow(/foreign key/);
  });

  it("removes tenant billing rows with the organization", async () => {
    const { ledger } = await freshTenants();
    await ledger.consume({
      organizationId: CONTRACT_OTHER_ORG,
      quota: "provider_sync_jobs",
      usageKey: "job-1",
      periodKey: "2026-10",
      limit: null,
      consumedAt: new Date(),
    });

    await isolated.pool.query("DELETE FROM organizations WHERE id = $1", [CONTRACT_OTHER_ORG]);

    const remaining = await isolated.pool.query(
      "SELECT COUNT(*)::int AS count FROM billing_quota_consumptions WHERE organization_id = $1",
      [CONTRACT_OTHER_ORG],
    );
    expect(remaining.rows[0]).toEqual({ count: 0 });
  });
});
