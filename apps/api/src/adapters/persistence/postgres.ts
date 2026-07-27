import pg from "pg";
import type { Pool } from "pg";

export type DbHealthStatus = "ok" | "error" | "skipped";

export interface PostgresHealth {
  check(): Promise<DbHealthStatus>;
  close(): Promise<void>;
}

/**
 * Shared Postgres pool factory. Without `DATABASE_URL` returns undefined so
 * modules can fall back to in-memory adapters for local/dev.
 */
export function createPostgresPool(databaseUrl: string | undefined): Pool | undefined {
  if (!databaseUrl) {
    return undefined;
  }
  return new pg.Pool({ connectionString: databaseUrl, max: 5 });
}

/**
 * Lazy Postgres health probe. Without a pool it reports `skipped` so the API
 * boots without a database.
 */
export function createPostgresHealth(pool: Pool | undefined): PostgresHealth {
  if (!pool) {
    return {
      check: () => Promise.resolve("skipped"),
      close: () => Promise.resolve(),
    };
  }

  return {
    async check() {
      try {
        await pool.query("SELECT 1");
        return "ok";
      } catch {
        return "error";
      }
    },
    async close() {
      await pool.end();
    },
  };
}
