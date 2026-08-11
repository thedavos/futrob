import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Pool, type PoolClient } from "pg";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const schemas: string[] = [];

suite("0025 competition fixtures migration", () => {
  afterEach(async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      for (const schema of schemas.splice(0)) {
        await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      }
    } finally {
      await pool.end();
    }
  });

  it("applies from a clean database", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client);
      const result = await client.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = current_schema()
           AND table_name IN (
             'fixture_plans', 'fixture_stages', 'fixture_rounds',
             'fixture_encounters', 'fixture_encounter_audit', 'encounter_series'
           )
         ORDER BY table_name`,
      );
      expect(result.rows.map((row) => row.table_name)).toEqual([
        "encounter_series",
        "fixture_encounter_audit",
        "fixture_encounters",
        "fixture_plans",
        "fixture_rounds",
        "fixture_stages",
      ]);
    });
  });

  it("enforces tenant-scoped fixture graphs and generation idempotency", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client);
      await insertCompetition(client, "org-a", "comp-a");
      await insertCompetition(client, "org-b", "comp-b");
      await insertPlan(client, "plan-a", "org-a", "comp-a", "generation-1");

      await expect(
        insertPlan(client, "plan-a-duplicate", "org-a", "comp-a", "generation-1"),
      ).rejects.toMatchObject({ code: "23505" });
      await expect(
        client.query(
          `INSERT INTO fixture_stages (
             id, fixture_plan_id, organization_id, competition_id, kind, stage_order
           ) VALUES ('stage-cross-tenant', 'plan-a', 'org-b', 'comp-b', 'league', 1)`,
        ),
      ).rejects.toMatchObject({ code: "23503" });

      await expect(
        insertPlan(client, "plan-b", "org-b", "comp-b", "generation-1"),
      ).resolves.toBeUndefined();
    });
  });
});

async function insertCompetition(
  client: PoolClient,
  organizationId: string,
  competitionId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO organizations (
       id, name, normalized_name, created_at, created_by_actor_id
     ) VALUES ($1, $2, $3, NOW(), 'organizer')`,
    [organizationId, organizationId, organizationId],
  );
  await client.query(
    `INSERT INTO competitions (
       id, organization_id, name, status, modality, game_edition, platform,
       region, time_zone, format, created_by_actor_id, created_at, updated_at
     ) VALUES (
       $1, $2, $1, 'published', 'fc-clubs', 'fc26', 'playstation',
       'south-america', 'America/Lima', 'league', 'organizer', NOW(), NOW()
     )`,
    [competitionId, organizationId],
  );
}

async function insertPlan(
  client: PoolClient,
  id: string,
  organizationId: string,
  competitionId: string,
  generationKey: string,
): Promise<void> {
  await client.query(
    `INSERT INTO fixture_plans (
       id, revision, generation_key, generation_fingerprint, organization_id, competition_id,
       rules_version, generation_version, format, time_zone, seed
     ) VALUES ($1, 1, $2, $2, $3, $4, 1, 1, 'league', 'America/Lima', '["team-a","team-b"]')`,
    [id, generationKey, organizationId, competitionId],
  );
}

async function withSchema(run: (client: PoolClient) => Promise<void>): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  const schema = `fixture_migration_${randomUUID().replaceAll("-", "")}`;
  schemas.push(schema);
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await run(client);
  } finally {
    client.release();
    await pool.end();
  }
}

async function applyMigrations(client: PoolClient): Promise<void> {
  const directory = resolve(import.meta.dirname, "../../../migrations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await client.query(await readFile(resolve(directory, file), "utf8"));
  }
}
