import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ClientBase } from "pg";
import { TaggedError } from "@futrob/shared-kernel";

/** Table created by the first migration; its presence means a schema already exists. */
const LEGACY_SCHEMA_MARKER_TABLE = "organizations";

export class MigrationBaselineRequiredError extends TaggedError("MigrationBaselineRequiredError")<{
  code: "migrations.baseline_required";
  message: string;
}> {}

export class MigrationBaselineInvalidError extends TaggedError("MigrationBaselineInvalidError")<{
  code: "migrations.baseline_invalid";
  message: string;
}> {}

export interface MigrationRunResult {
  /** Files executed by this run. */
  readonly applied: readonly string[];
  /** Files recorded as already applied without being executed (`baseline`). */
  readonly baselined: readonly string[];
  readonly total: number;
}

function migrationNumber(file: string): number {
  return Number.parseInt(file.slice(0, 4), 10);
}

/**
 * Applies pending `*.sql` files in filename order, one transaction each, recorded in
 * `schema_migrations` (ADR-0021: the single schema history).
 *
 * A database that already has the product schema but no ledger (created before this
 * runner existed) is never replayed from 0001: the run refuses until `baseline` says
 * which migration number the schema is already at. Baselined files are recorded, not run.
 */
export async function runMigrations(
  client: ClientBase,
  input: {
    readonly directory: string;
    readonly baseline?: number;
    readonly onApplied?: (file: string) => void;
  },
): Promise<MigrationRunResult> {
  // Serializes concurrent runners (e.g. two deploys) on the same database.
  await client.query("SELECT pg_advisory_lock(hashtextextended('futrob-migrations', 0))");
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         id TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
    );
    const files = (await readdir(input.directory)).filter((file) => file.endsWith(".sql")).sort();
    const applied = new Set(
      (await client.query<{ id: string }>("SELECT id FROM schema_migrations")).rows.map(
        (row) => row.id,
      ),
    );

    const baselined = applied.size === 0 ? await recordBaseline(client, files, input.baseline) : [];
    if (applied.size > 0 && input.baseline !== undefined) {
      throw new MigrationBaselineInvalidError({
        code: "migrations.baseline_invalid",
        message:
          "schema_migrations already has entries; a baseline only applies to an unledgered schema",
      });
    }
    for (const file of baselined) applied.add(file);

    const pending = files.filter((file) => !applied.has(file));
    for (const file of pending) {
      await client.query("BEGIN");
      try {
        await client.query(await readFile(resolve(input.directory, file), "utf8"));
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      input.onApplied?.(file);
    }

    return { applied: pending, baselined, total: files.length };
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtextextended('futrob-migrations', 0))");
  }
}

async function recordBaseline(
  client: ClientBase,
  files: readonly string[],
  baseline: number | undefined,
): Promise<readonly string[]> {
  const existing = await client.query<{ present: boolean }>(
    "SELECT to_regclass($1) IS NOT NULL AS present",
    [LEGACY_SCHEMA_MARKER_TABLE],
  );
  const hasSchema = existing.rows[0]?.present === true;

  if (baseline === undefined) {
    if (!hasSchema) return [];
    throw new MigrationBaselineRequiredError({
      code: "migrations.baseline_required",
      message:
        "The database already has a schema but no schema_migrations ledger. Re-run with " +
        "--baseline <N>, where N is the number of the last migration already applied " +
        "(replaying from 0001 is not safe).",
    });
  }

  const newest = Math.max(...files.map(migrationNumber));
  if (!hasSchema || !Number.isInteger(baseline) || baseline < 1 || baseline > newest) {
    throw new MigrationBaselineInvalidError({
      code: "migrations.baseline_invalid",
      message: hasSchema
        ? `--baseline must be an integer between 1 and ${newest}`
        : "--baseline needs an existing schema; this database is empty, run without it",
    });
  }

  const covered = files.filter((file) => migrationNumber(file) <= baseline);
  await client.query("BEGIN");
  try {
    for (const file of covered) {
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  return covered;
}
