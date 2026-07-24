import pg from "pg";
import type { Pool } from "pg";

export type DbHealthStatus = "ok" | "error" | "skipped";

export interface PostgresHealth {
  check(): Promise<DbHealthStatus>;
  close(): Promise<void>;
}

/**
 * Lazy Postgres health probe. Without `DATABASE_URL` (local/test) it reports
 * `skipped` so the API boots without a database. The pool opens on first check.
 */
export function createPostgresHealth(databaseUrl: string | undefined): PostgresHealth {
  if (!databaseUrl) {
    return {
      check: () => Promise.resolve("skipped"),
      close: () => Promise.resolve(),
    };
  }

  let pool: Pool | undefined;
  const getPool = (): Pool => {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 3 });
    return pool;
  };

  return {
    async check() {
      try {
        await getPool().query("SELECT 1");
        return "ok";
      } catch {
        return "error";
      }
    },
    async close() {
      if (pool) {
        await pool.end();
      }
    },
  };
}
