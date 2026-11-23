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
  /** Longest a check waits for a pooled or newly opened connection before it fails (503). */
  connectionTimeoutMillis: number;
  /** Server side: longest one statement of a check may run. */
  statementTimeoutMillis: number;
  /** How long an unused connection stays open, so a quiet spell does not force a reconnect. */
  idleTimeoutMillis: number;
}>;

/**
 * The client-side bound of a whole check, network stalls included, is the limiter's
 * `RATE_LIMIT_CHECK_BUDGET_MS`; these limits only bound its parts. Not measured against
 * Railway or Neon.
 */
export const RATE_LIMIT_POOL_LIMITS = {
  max: 5,
  connectionTimeoutMillis: 1_000,
  statementTimeoutMillis: 1_000,
  idleTimeoutMillis: 60_000,
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
    idleTimeoutMillis: limits.idleTimeoutMillis,
    keepAlive: true,
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
