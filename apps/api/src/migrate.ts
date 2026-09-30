import { resolve } from "node:path";
import pg from "pg";
import { runMigrations } from "@/adapters/persistence/migration-runner.ts";
import { loadEnv } from "@/config/env.ts";
import { apiConsoleLogger } from "@/context/styled-console-logger.ts";
import { parseBaseline } from "@/migrate-args.ts";
import { loadDotEnvFile } from "@/utils/load-dotenv.ts";

/**
 * Applies pending `migrations/*.sql` in filename order (ADR-0021: the single
 * schema history for product, auth and actors).
 *
 * Usage: `npm run migrate -w @futrob/api [-- --baseline <N>]` (DATABASE_URL from
 * apps/api/.env). `--baseline` is only for a database whose schema predates the
 * `schema_migrations` ledger: it records migrations up to N as applied without running them.
 */
loadDotEnvFile();

const { databaseUrl } = loadEnv();
if (!databaseUrl) {
  apiConsoleLogger.error("migrate.database_url_missing");
  process.exit(1);
}

let baseline: number | undefined;
try {
  baseline = parseBaseline(process.argv.slice(2));
} catch (error) {
  apiConsoleLogger.error("migrate.failed", {
    message: error instanceof Error ? error.message : "unknown error",
  });
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  const result = await runMigrations(client, {
    directory: resolve(import.meta.dirname, "../migrations"),
    baseline,
    onApplied: (file) => apiConsoleLogger.info("migrate.applied", { file }),
  });
  if (result.baselined.length > 0) {
    apiConsoleLogger.info("migrate.baselined", { through: result.baselined.length });
  }
  apiConsoleLogger.info("migrate.done", { applied: result.applied.length, total: result.total });
} catch (error) {
  apiConsoleLogger.error("migrate.failed", {
    message: error instanceof Error ? error.message : "unknown error",
  });
  process.exitCode = 1;
} finally {
  await client.end();
}
