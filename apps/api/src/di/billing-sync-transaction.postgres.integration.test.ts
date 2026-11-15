import { asActorId } from "@futrob/shared-kernel";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { createModules } from "./create-modules.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("billing sync transaction in Postgres", () => {
  let isolated: IsolatedSchema;
  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl!, "billing_sync");
    await migrateIsolatedSchema(isolated.pool);
  }, 60_000);
  afterAll(async () => {
    await isolated?.drop();
  });

  it("rolls back quota when the real job INSERT fails and retries with the last unit", async () => {
    const actorId = asActorId("sync-organizer");
    await seedActors(isolated.pool, actorId);
    const modules = createModules({
      pool: isolated.pool,
      fetcher: async () => {
        throw new Error("EA must not be called during enqueue");
      },
      eaClubsBaseUrl: "https://ea.example.test/api/fc",
    });
    const created = await modules.organizations.createOrganization.execute({
      name: "Sync rollback",
      actorId,
      timeZone: "UTC",
    });
    if (!created.isOk()) throw created.error;
    const organizationId = created.value.organization.id;
    await isolated.pool.query(`UPDATE billing_plans SET entitlements = jsonb_set(
      entitlements, '{quotas,provider_sync_jobs,amount}', '1') WHERE key = 'free'`);
    await isolated.pool
      .query(`CREATE FUNCTION reject_sync_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'simulated job INSERT failure'; END $$`);
    await isolated.pool.query(`CREATE TRIGGER fail_sync_insert BEFORE INSERT ON provider_sync_jobs
      FOR EACH ROW EXECUTE FUNCTION reject_sync_insert()`);
    const input = {
      organizationId,
      providerKey: "ea-clubs" as const,
      requestId: "rollback-proof",
      sync: {
        externalClubId: "club-a",
        platform: "common-gen5",
        gameEdition: "fc26",
        matchType: "friendlyMatch",
        maxResultCount: 10,
      },
    };
    await expect(modules.gameData.enqueueProviderSyncJob.execute(input)).rejects.toThrow(
      "simulated job INSERT failure",
    );
    const counts = async () => {
      const result = await isolated.pool.query(
        `SELECT
        (SELECT COUNT(*)::int FROM billing_quota_consumptions WHERE organization_id = $1) AS usage,
        (SELECT COUNT(*)::int FROM provider_sync_jobs WHERE organization_id = $1) AS jobs`,
        [organizationId],
      );
      return result.rows[0];
    };
    expect(await counts()).toEqual({ usage: 0, jobs: 0 });
    await isolated.pool.query("DROP TRIGGER fail_sync_insert ON provider_sync_jobs");
    const retry = await modules.gameData.enqueueProviderSyncJob.execute(input);
    expect(retry.isOk()).toBe(true);
    expect(await counts()).toEqual({ usage: 1, jobs: 1 });
    const replay = await modules.gameData.enqueueProviderSyncJob.execute(input);
    expect(replay.isOk() && retry.isOk() && replay.value.id === retry.value.id).toBe(true);
    expect(await counts()).toEqual({ usage: 1, jobs: 1 });
  });
});
