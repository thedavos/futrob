import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { loadEnv } from "@/config/env.ts";
import { apiConsoleLogger } from "@/context/styled-console-logger.ts";
import { loadDotEnvFile } from "@/utils/load-dotenv.ts";

/**
 * Applies pending `migrations/*.sql` in filename order (ADR-0021: the single
 * schema history for product, auth and actors). Each file runs in its own
 * transaction and is recorded in `schema_migrations`.
 *
 * Usage: `npm run migrate -w @futrob/api` (uses DATABASE_URL from apps/api/.env).
 */
loadDotEnvFile();

const { databaseUrl } = loadEnv();
if (!databaseUrl) {
  apiConsoleLogger.error("migrate.database_url_missing");
  process.exit(1);
}

const directory = resolve(import.meta.dirname, "../migrations");
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  // Serializes concurrent runners (e.g. two deploys) on the same database.
  await client.query("SELECT pg_advisory_lock(hashtextextended('futrob-migrations', 0))");
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       id TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );
  const applied = new Set(
    (await client.query<{ id: string }>("SELECT id FROM schema_migrations")).rows.map(
      (row) => row.id,
    ),
  );

  const pending = (await readdir(directory))
    .filter((file) => file.endsWith(".sql") && !applied.has(file))
    .sort();

  for (const file of pending) {
    await client.query("BEGIN");
    try {
      await client.query(await readFile(resolve(directory, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      apiConsoleLogger.error("migrate.failed", { file });
      throw error;
    }
    apiConsoleLogger.info("migrate.applied", { file });
  }

  apiConsoleLogger.info("migrate.done", {
    applied: pending.length,
    total: applied.size + pending.length,
  });
} finally {
  await client.end();
}
