import { z } from "zod";
import type { ClientBase, Pool, QueryConfig } from "pg";
import {
  decideRateLimit,
  longestRateLimitWindowMs,
  rateLimitWindow,
  type RateLimitAttempt,
  type RateLimitDecision,
  type RateLimiter,
  type RateLimitPolicies,
} from "./rate-limit-policies.ts";
import { fingerprintRateLimitSubject } from "./rate-limit-fingerprint.ts";

export interface PostgresQueryResult {
  readonly rows: readonly unknown[];
}

export type PostgresQueryOptions = Readonly<{
  /** Client-side wait for the reply; on expiry the query rejects without a SQLSTATE. */
  timeoutMs?: number;
}>;

export interface PostgresQueryable {
  query(
    text: string,
    values?: readonly unknown[],
    options?: PostgresQueryOptions,
  ): Promise<PostgresQueryResult>;
}

/**
 * Adapts a pg client, passing the per-query timeout as pg's `query_timeout`. pg reads it
 * from the query config at runtime (`Client.query`); `@types/pg` only types it on the
 * client config.
 */
export function postgresQueryable(client: Pick<ClientBase, "query">): PostgresQueryable {
  return {
    query: (text, values, options) => {
      const config: QueryConfig & { query_timeout?: number } = {
        text,
        values: values ? [...values] : [],
        query_timeout: options?.timeoutMs,
      };
      return client.query(config);
    },
  };
}

/** Runs `run` on one connection and always releases it. */
export type WithPostgres = <T>(run: (client: PostgresQueryable) => Promise<T>) => Promise<T>;

/**
 * Checks out one pooled connection per check: the counters need their own transaction.
 * After a Postgres error (lock or statement timeout) the transaction was rolled back and
 * the connection goes back to the pool; any other failure (a lost connection, a failed
 * ROLLBACK) destroys it, in case its transaction is still open.
 */
export function withPoolConnection(pool: Pool): WithPostgres {
  return async (run) => {
    const client = await pool.connect();
    try {
      const result = await run(postgresQueryable(client));
      client.release();
      return result;
    } catch (error) {
      if (postgresErrorSchema.safeParse(error).success) client.release();
      else client.release(error instanceof Error ? error : true);
      throw error;
    }
  };
}

/** An error the server answered with a SQLSTATE: the connection itself still works. */
const postgresErrorSchema = z.object({ code: z.string().regex(/^[0-9A-Z]{5}$/) });

/**
 * Longest a check waits for another check's row lock. A burst from one IP or actor queues
 * on the same counter row while holding pooled connections; past this the check fails
 * (503, the BFF fails closed) instead of starving the rest of the API.
 */
export const RATE_LIMIT_LOCK_TIMEOUT_MS = 300;

/**
 * Whole budget of one check, from asking for a connection to the COMMIT reply. Each
 * statement waits only for what is left, so a slow COMMIT can use the time the earlier
 * statements did not need. A failed check adds at most `ROLLBACK_TIMEOUT_MS`; both stay
 * under the web BFF's 4 s timeout.
 */
export const RATE_LIMIT_CHECK_BUDGET_MS = 2_500;

const ROLLBACK_TIMEOUT_MS = 500;

const INCREMENT_WINDOW_SQL = `
INSERT INTO app_rate_limit_windows (
  policy,
  subject_kind,
  subject_fingerprint,
  window_started_at,
  request_count
)
VALUES ($1, $2, $3, $4, 1)
ON CONFLICT (policy, subject_kind, subject_fingerprint, window_started_at)
DO UPDATE SET request_count = app_rate_limit_windows.request_count + 1
RETURNING request_count
`;

// Skips rows another check is already purging, so concurrent purges never wait on or
// deadlock with each other; whatever is skipped goes on the next check.
const PURGE_EXPIRED_WINDOWS_SQL = `
DELETE FROM app_rate_limit_windows
WHERE (policy, subject_kind, subject_fingerprint, window_started_at) IN (
  SELECT policy, subject_kind, subject_fingerprint, window_started_at
  FROM app_rate_limit_windows
  WHERE window_started_at < $1
  FOR UPDATE SKIP LOCKED
)
`;

const requestCountSchema = z.object({ request_count: z.number().int().min(1) });

export class PostgresRateLimiter implements RateLimiter {
  private readonly withPostgres: WithPostgres;
  private readonly fingerprintSecret: string;
  private readonly policies: RateLimitPolicies;
  private readonly maxPolicyWindowMs: number;
  private readonly lockTimeoutMs: number;
  private readonly budgetMs: number;
  private readonly elapsedMs: () => number;

  constructor(
    input: Readonly<{
      withPostgres: WithPostgres;
      fingerprintSecret: string;
      policies: RateLimitPolicies;
      lockTimeoutMs?: number;
      budgetMs?: number;
      /** Monotonic milliseconds; only differences are used. */
      monotonicNow?: () => number;
    }>,
  ) {
    this.withPostgres = input.withPostgres;
    this.fingerprintSecret = input.fingerprintSecret;
    this.policies = input.policies;
    this.maxPolicyWindowMs = longestRateLimitWindowMs(input.policies);
    const lockTimeoutMs = input.lockTimeoutMs ?? RATE_LIMIT_LOCK_TIMEOUT_MS;
    if (!Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs <= 0) {
      throw new Error("Rate-limit lock timeout must be a positive integer");
    }
    this.lockTimeoutMs = lockTimeoutMs;
    this.budgetMs = input.budgetMs ?? RATE_LIMIT_CHECK_BUDGET_MS;
    this.elapsedMs = input.monotonicNow ?? (() => performance.now());
  }

  async check(attempt: RateLimitAttempt): Promise<RateLimitDecision> {
    if (!/^[a-f0-9]{64}$/.test(attempt.ipFingerprint)) {
      throw new Error("Rate-limit IP fingerprint must be a SHA-256 hex digest");
    }
    const config = this.policies[attempt.policy];
    const window = rateLimitWindow(config, attempt.nowMs);
    const actorId = attempt.actorId;
    const actorFingerprint =
      actorId === null
        ? null
        : await fingerprintRateLimitSubject(this.fingerprintSecret, "actor", actorId);
    const retentionCutoff = attempt.nowMs - this.maxPolicyWindowMs;

    const deadline = this.elapsedMs() + this.budgetMs;
    const remaining = (): PostgresQueryOptions => {
      const timeoutMs = Math.ceil(deadline - this.elapsedMs());
      if (timeoutMs <= 0) throw new Error("Rate-limit check ran out of time");
      return { timeoutMs };
    };

    // Purge and both counters commit together. The purge skips locked rows and the
    // counters run in a fixed order, so concurrent checks never deadlock.
    const { actorCount, ipCount } = await this.withPostgres((client) =>
      inTransaction(client, remaining, async () => {
        await client.query(`SET LOCAL lock_timeout = '${this.lockTimeoutMs}ms'`, [], remaining());
        await client.query(PURGE_EXPIRED_WINDOWS_SQL, [retentionCutoff], remaining());
        const actor =
          actorFingerprint === null
            ? null
            : await client.query(
                INCREMENT_WINDOW_SQL,
                [attempt.policy, "actor", actorFingerprint, window.windowStartedAt],
                remaining(),
              );
        const ip = await client.query(
          INCREMENT_WINDOW_SQL,
          [attempt.policy, "ip", attempt.ipFingerprint, window.windowStartedAt],
          remaining(),
        );
        return { actorCount: actor === null ? 0 : readCount(actor), ipCount: readCount(ip) };
      }),
    );

    return decideRateLimit({ config, window, nowMs: attempt.nowMs, actorCount, ipCount });
  }
}

/**
 * If the COMMIT reply does not arrive in time its outcome is unknown: the counters may
 * have been incremented. The check still fails closed (503).
 */
async function inTransaction<T>(
  client: PostgresQueryable,
  remaining: () => PostgresQueryOptions,
  run: () => Promise<T>,
): Promise<T> {
  try {
    await client.query("BEGIN", [], remaining());
    const result = await run();
    await client.query("COMMIT", [], remaining());
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK", [], { timeoutMs: ROLLBACK_TIMEOUT_MS });
    } catch {
      // No SQLSTATE: the pool destroys this connection instead of reusing it mid-transaction.
      throw new Error("Rate-limit transaction could not roll back", { cause: error });
    }
    throw error;
  }
}

function readCount(result: PostgresQueryResult): number {
  const parsed = requestCountSchema.safeParse(result.rows[0]);
  if (!parsed.success) {
    throw new Error("Rate-limit counter did not return a valid count");
  }
  return parsed.data.request_count;
}
