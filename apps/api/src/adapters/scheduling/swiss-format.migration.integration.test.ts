import { copyFile, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_ORGANIZATION_PLANS } from "@futrob/billing";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { PostgresPlanCatalog } from "@/adapters/billing/plan-catalog.ts";
import {
  createIsolatedSchema,
  insertTenant,
  migrateIsolatedSchema,
  MIGRATIONS_DIRECTORY,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const schemas: IsolatedSchema[] = [];
const directories: string[] = [];
const MIGRATION = "0064_swiss_format.sql";

async function schema(): Promise<IsolatedSchema> {
  const created = await createIsolatedSchema(databaseUrl ?? "", "swiss_migration");
  schemas.push(created);
  return created;
}

/** A migrations directory that stops right before the Swiss migration. */
async function historyBeforeSwiss(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "swiss-migration-"));
  directories.push(directory);
  for (const file of await readdir(MIGRATIONS_DIRECTORY)) {
    if (file.endsWith(".sql") && file < MIGRATION) {
      await copyFile(join(MIGRATIONS_DIRECTORY, file), join(directory, file));
    }
  }
  return directory;
}

async function insertPlan(isolated: IsolatedSchema, id: string, format: string): Promise<void> {
  await isolated.pool.query(
    `INSERT INTO fixture_plans (
       id, revision, status, generation_key, generation_fingerprint, organization_id,
       competition_id, rules_version, generation_version, format, time_zone, home_and_away, seed
     ) VALUES ($1, 1, 'active', $1, $1, 'org-a', 'comp-a', 1, 1, $2, 'UTC', false, '["a","b"]')`,
    [id, format],
  );
}

suite("0064 Swiss format migration", () => {
  afterEach(async () => {
    for (const created of schemas.splice(0)) await created.drop();
    for (const directory of directories.splice(0)) {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("installs from a clean database with the catalog the code expects", async () => {
    const isolated = await schema();

    await migrateIsolatedSchema(isolated.pool);

    const catalog = new PostgresPlanCatalog(isolated.pool);
    expect(await catalog.listOrganizationPlans()).toEqual(DEFAULT_ORGANIZATION_PLANS);
    const formats = await catalog.findOrganizationPlan("free");
    expect(formats?.entitlements.features.competitionFormats).not.toContain("swiss");
    expect((await catalog.findOrganizationPlan("pro"))?.version).toBe(2);
    expect((await catalog.findOrganizationPlan("league"))?.version).toBe(2);
  });

  it("upgrades from 0063 keeping existing rows and widening what it allows", async () => {
    const isolated = await schema();
    const before = await migrateIsolatedSchema(isolated.pool, await historyBeforeSwiss());
    expect(before.applied).not.toContain(MIGRATION);
    await insertTenant(isolated.pool, "org-a", "comp-a");
    await insertPlan(isolated, "plan-league", "league");
    await expect(insertPlan(isolated, "plan-too-early", "swiss")).rejects.toMatchObject({
      code: "23514",
    });

    const upgrade = await migrateIsolatedSchema(isolated.pool);

    expect(upgrade.applied).toEqual([MIGRATION]);
    const existing = await isolated.pool.query(
      `SELECT withdrawn_team_ids FROM fixture_plans WHERE id = 'plan-league'`,
    );
    expect(existing.rows).toEqual([{ withdrawn_team_ids: [] }]);
    await isolated.pool.query(`UPDATE fixture_plans SET status = 'superseded'`);
    await isolated.pool.query(`UPDATE competitions SET format = 'swiss' WHERE id = 'comp-a'`);
    await isolated.pool.query(
      `INSERT INTO fixture_plans (
         id, revision, status, generation_key, generation_fingerprint, organization_id,
         competition_id, rules_version, generation_version, format, time_zone, home_and_away, seed
       ) VALUES ('plan-swiss', 1, 'active', 'k', 'f', 'org-a', 'comp-a', 1, 2, 'swiss', 'UTC', false, '["a","b"]')`,
    );
    await isolated.pool.query(
      `INSERT INTO fixture_stages (id, fixture_plan_id, organization_id, competition_id, kind, stage_order)
       VALUES ('stage-swiss', 'plan-swiss', 'org-a', 'comp-a', 'swiss', 1)`,
    );
    await expect(insertPlan(isolated, "plan-unknown", "double-elimination")).rejects.toMatchObject({
      code: "23514",
    });
  });

  it("changes nothing when the whole file runs again", async () => {
    const isolated = await schema();
    await migrateIsolatedSchema(isolated.pool);
    const script = await isolated.pool.query(
      `SELECT key, version, entitlements #> '{features,competitionFormats}' AS formats
       FROM billing_plans WHERE key IN ('pro', 'league') ORDER BY key`,
    );
    await isolated.pool.query(await readFile(join(MIGRATIONS_DIRECTORY, MIGRATION), "utf8"));
    const again = await isolated.pool.query(
      `SELECT key, version, entitlements #> '{features,competitionFormats}' AS formats
       FROM billing_plans WHERE key IN ('pro', 'league') ORDER BY key`,
    );
    expect(again.rows).toEqual(script.rows);
  });

  it("requires a registered actor and one target per action kind", async () => {
    const isolated = await schema();
    await migrateIsolatedSchema(isolated.pool);
    await insertTenant(isolated.pool, "org-a", "comp-a");
    await insertPlan(isolated, "plan-a", "league");
    const insert = (actor: string, kind: string, teamId: string | null, round: number | null) =>
      isolated.pool.query(
        `INSERT INTO swiss_round_actions (
           id, organization_id, competition_id, fixture_plan_id, kind, team_id, round_number,
           actor_id, reason, request_id, occurred_at
         ) VALUES (gen_random_uuid()::text, 'org-a', 'comp-a', 'plan-a', $1, $2, $3, $4, 'Why',
                   gen_random_uuid()::text, NOW())`,
        [kind, teamId, round, actor],
      );

    await expect(insert("nobody", "withdraw", "team", null)).rejects.toMatchObject({
      code: "23503",
    });
    await expect(insert("tenant-organizer", "withdraw", null, 1)).rejects.toMatchObject({
      code: "23514",
    });
    await expect(insert("tenant-organizer", "close_round", null, 1)).resolves.toBeDefined();
  });
});
