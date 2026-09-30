import { resolve } from "node:path";
import pg from "pg";
import { runMigrations } from "@/adapters/persistence/migration-runner.ts";
import { loadEnv } from "@/config/env.ts";
import { apiConsoleLogger } from "@/context/styled-console-logger.ts";
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

function parseBaseline(argv: readonly string[]): number | undefined {
  const index = argv.findIndex((arg) => arg === "--baseline" || arg.startsWith("--baseline="));
  if (index === -1) return undefined;
  const arg = argv[index] ?? "";
  const raw = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : argv[index + 1];
  return Number.parseInt(raw ?? "", 10);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  const result = await runMigrations(client, {
    directory: resolve(import.meta.dirname, "../migrations"),
    baseline: parseBaseline(process.argv.slice(2)),
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
