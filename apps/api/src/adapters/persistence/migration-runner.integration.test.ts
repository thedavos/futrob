import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  MigrationBaselineInvalidError,
  MigrationBaselineRequiredError,
  runMigrations,
} from "./migration-runner.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const directory = resolve(import.meta.dirname, "../../../migrations");
// Every case applies migrations to a possibly remote database, one round trip each.
const TEST_TIMEOUT_MS = 180_000;
const schemas: string[] = [];

suite("migration runner", () => {
  afterEach(async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      for (const schema of schemas.splice(0)) {
        await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      }
    } finally {
      await client.end();
    }
  });

  it(
    "applies everything to an empty database and is a no-op the second time",
    async () => {
      await withSchema(async (client) => {
        const first = await runMigrations(client, { directory });
        expect(first.applied).toHaveLength(first.total);
        expect(first.baselined).toEqual([]);
        expect(await tableExists(client, "team_performance_ranking_snapshots")).toBe(true);

        const second = await runMigrations(client, { directory });
        expect(second.applied).toEqual([]);
        expect(await ledger(client)).toHaveLength(first.total);
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "refuses to replay a schema that predates the ledger, then upgrades with a baseline",
    async () => {
      await withSchema(async (client) => {
        // The schema as it was before 0043: applied by hand, no schema_migrations table.
        for (const file of await migrationFiles(42)) {
          await client.query(await readFile(resolve(directory, file), "utf8"));
        }

        await expect(runMigrations(client, { directory })).rejects.toBeInstanceOf(
          MigrationBaselineRequiredError,
        );
        expect(await ledger(client)).toEqual([]);
        expect(await tableExists(client, "actors")).toBe(false);

        const upgraded = await runMigrations(client, { directory, baseline: 42 });
        expect(upgraded.baselined).toHaveLength(42);
        // Everything after the baseline runs, starting with the auth move.
        expect(upgraded.applied).toEqual((await migrationFiles(Infinity)).slice(42));
        expect(upgraded.applied.slice(0, 2)).toEqual([
          "0043_auth_and_actors.sql",
          "0044_actor_foreign_keys.sql",
        ]);
        expect(await tableExists(client, "actors")).toBe(true);
        expect(await tableExists(client, "auth_users")).toBe(true);
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "upgrades the 0046 schema with the team ranking and provider sync checkpoint migrations",
    async () => {
      await withSchema(async (client) => {
        for (const file of await migrationFiles(46)) {
          await client.query(await readFile(resolve(directory, file), "utf8"));
        }
        const upgraded = await runMigrations(client, { directory, baseline: 46 });
        expect(upgraded.applied).toEqual([
          "0047_team_performance_rankings.sql",
          "0049_provider_sync_ingestion_checkpoint.sql",
        ]);
        expect(upgraded.baselined).toHaveLength((await migrationFiles(46)).length);
        expect(await tableExists(client, "team_performance_ranking_snapshots")).toBe(true);
        expect(
          (
            await client.query(
              "SELECT to_regclass('team_performance_contributions_scope_idx') AS index",
            )
          ).rows[0].index,
        ).not.toBeNull();
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "upgrades a 0047 job without inventing a completed ingestion",
    async () => {
      await withSchema(async (client) => {
        for (const file of await migrationFiles(47)) {
          await client.query(await readFile(resolve(directory, file), "utf8"));
        }
        await client.query(
          `INSERT INTO provider_sync_jobs (
             id, organization_id, provider_key, kind, input_json, dedupe_key, request_id,
             status, attempt, max_attempts, available_at, created_at, updated_at
           ) VALUES ('legacy-job', 'legacy-org', 'ea-clubs', 'recent-matches',
             '{"externalClubId":"club-home","platform":"common-gen5","gameEdition":"fc26","matchType":"friendlyMatch","maxResultCount":10}',
             'legacy-dedupe', 'legacy-request', 'queued', 0, 4, NOW(), NOW(), NOW())`,
        );
        const upgraded = await runMigrations(client, { directory, baseline: 47 });
        expect(upgraded.applied).toEqual(["0049_provider_sync_ingestion_checkpoint.sql"]);
        expect(
          (
            await client.query(
              "SELECT id, status, attempt, ingested_matches_json FROM provider_sync_jobs",
            )
          ).rows,
        ).toEqual([
          {
            id: "legacy-job",
            status: "queued",
            attempt: 0,
            ingested_matches_json: null,
          },
        ]);
        expect((await runMigrations(client, { directory })).applied).toEqual([]);
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "rejects a baseline on an empty database and on an already ledgered one",
    async () => {
      await withSchema(async (client) => {
        await expect(runMigrations(client, { directory, baseline: 10 })).rejects.toBeInstanceOf(
          MigrationBaselineInvalidError,
        );
        expect(await tableExists(client, "organizations")).toBe(false);
      });
      await withSchema(async (client) => {
        await client.query(await readFile(resolve(directory, "0001_organizations.sql"), "utf8"));
        await client.query(
          `CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
        );
        await client.query("INSERT INTO schema_migrations (id) VALUES ('0001_organizations.sql')");

        await expect(runMigrations(client, { directory, baseline: 1 })).rejects.toBeInstanceOf(
          MigrationBaselineInvalidError,
        );
      });
    },
    TEST_TIMEOUT_MS,
  );
});

async function withSchema(run: (client: Client) => Promise<void>): Promise<void> {
  const schema = `migration_runner_${randomUUID().replaceAll("-", "")}`;
  schemas.push(schema);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await run(client);
  } finally {
    await client.end();
  }
}

async function migrationFiles(through: number): Promise<string[]> {
  return (await readdir(directory))
    .filter((file) => file.endsWith(".sql") && Number.parseInt(file.slice(0, 4), 10) <= through)
    .sort();
}

async function ledger(client: Client): Promise<string[]> {
  const exists = await tableExists(client, "schema_migrations");
  if (!exists) return [];
  return (
    await client.query<{ id: string }>("SELECT id FROM schema_migrations ORDER BY id")
  ).rows.map((row) => row.id);
}

async function tableExists(client: Client, table: string): Promise<boolean> {
  const result = await client.query<{ present: boolean }>(
    "SELECT to_regclass($1) IS NOT NULL AS present",
    [table],
  );
  return result.rows[0]?.present === true;
}
