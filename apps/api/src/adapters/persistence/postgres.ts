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

export type RateLimitPoolLimits = Readonly<{
  /** Connections reserved for BFF rate-limit checks. */
  max: number;
  /** Longest a check waits for a free connection before it fails (503). */
  connectionTimeoutMillis: number;
  /** Longest one statement of a check may run. */
  statementTimeoutMillis: number;
}>;

export const RATE_LIMIT_POOL_LIMITS = {
  max: 2,
  connectionTimeoutMillis: 1_000,
  statementTimeoutMillis: 2_000,
} as const satisfies RateLimitPoolLimits;

/**
 * Small pool for BFF rate-limit checks only (ADR-0034). A burst of checks waiting on one
 * counter row fills these connections and then fails fast, without taking the product
 * pool that every other route uses.
 */
export function createRateLimitPostgresPool(
  databaseUrl: string | undefined,
  limits: RateLimitPoolLimits = RATE_LIMIT_POOL_LIMITS,
  options?: string,
): Pool | undefined {
  if (!databaseUrl) {
    return undefined;
  }
  return new pg.Pool({
    connectionString: databaseUrl,
    max: limits.max,
    connectionTimeoutMillis: limits.connectionTimeoutMillis,
    statement_timeout: limits.statementTimeoutMillis,
    options,
  });
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
