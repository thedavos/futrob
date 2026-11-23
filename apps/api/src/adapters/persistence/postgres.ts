import pg from "pg";
import type { Pool } from "pg";

export type DbHealthStatus = "ok" | "error" | "skipped";

export interface PostgresHealth {
  check(): Promise<DbHealthStatus>;
  close(): Promise<void>;
}

/**
 * Receives errors of idle pooled connections (database restart, failover, network reset).
 * pg emits them as an `error` event; without a listener Node crashes the process.
 */
export type IdleConnectionErrorHandler = (error: Error) => void;

/**
 * Shared Postgres pool factory. Without `DATABASE_URL` returns undefined so
 * modules can fall back to in-memory adapters for local/dev.
 */
export function createPostgresPool(
  databaseUrl: string | undefined,
  onIdleError: IdleConnectionErrorHandler,
): Pool | undefined {
  if (!databaseUrl) {
    return undefined;
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
  pool.on("error", onIdleError);
  return pool;
}

export type RateLimitPoolLimits = Readonly<{
  /** Connections reserved for BFF rate-limit checks. */
  max: number;
  /** Longest a check waits for a free connection before it fails (503). */
  connectionTimeoutMillis: number;
  /** Longest one statement of a check may run. */
  statementTimeoutMillis: number;
}>;

/**
 * Worst case of one check stays near 2 s (0.5 s for a connection, 0.5 s per lock wait on
 * the actor and IP rows), under the web BFF's 3 s timeout: the API gives up first, so a
 * request the BFF refuses is not counted afterwards.
 */
export const RATE_LIMIT_POOL_LIMITS = {
  max: 5,
  connectionTimeoutMillis: 500,
  statementTimeoutMillis: 1_000,
} as const satisfies RateLimitPoolLimits;

/**
 * Small pool for BFF rate-limit checks only (ADR-0034). A burst of checks waiting on one
 * counter row fills these connections and then fails fast, without taking the product
 * pool that every other route uses.
 */
export function createRateLimitPostgresPool(
  input: Readonly<{
    databaseUrl: string | undefined;
    onIdleError: IdleConnectionErrorHandler;
    limits?: RateLimitPoolLimits;
    /** Postgres startup options, such as `-c search_path=...` in tests. */
    options?: string;
  }>,
): Pool | undefined {
  if (!input.databaseUrl) {
    return undefined;
  }
  const limits = input.limits ?? RATE_LIMIT_POOL_LIMITS;
  const pool = new pg.Pool({
    connectionString: input.databaseUrl,
    max: limits.max,
    connectionTimeoutMillis: limits.connectionTimeoutMillis,
    statement_timeout: limits.statementTimeoutMillis,
    options: input.options,
  });
  pool.on("error", input.onIdleError);
  return pool;
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
