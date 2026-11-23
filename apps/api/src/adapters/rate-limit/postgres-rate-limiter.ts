import { z } from "zod";
import type { Pool } from "pg";
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

export interface PostgresQueryable {
  query(text: string, values?: readonly unknown[]): Promise<PostgresQueryResult>;
}

/** Runs `run` on one connection and always releases it. */
export type WithPostgres = <T>(run: (client: PostgresQueryable) => Promise<T>) => Promise<T>;

/** Checks out one pooled connection per check: the counters need their own transaction. */
export function withPoolConnection(pool: Pool): WithPostgres {
  return async (run) => {
    const client = await pool.connect();
    try {
      return await run({ query: (text, values) => client.query(text, values ? [...values] : []) });
    } finally {
      client.release();
    }
  };
}

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

  constructor(
    input: Readonly<{
      withPostgres: WithPostgres;
      fingerprintSecret: string;
      policies: RateLimitPolicies;
    }>,
  ) {
    this.withPostgres = input.withPostgres;
    this.fingerprintSecret = input.fingerprintSecret;
    this.policies = input.policies;
    this.maxPolicyWindowMs = longestRateLimitWindowMs(input.policies);
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

    // Purge and both counters commit together. The purge skips locked rows and the
    // counters run in a fixed order, so concurrent checks never deadlock.
    const { actorCount, ipCount } = await this.withPostgres((client) =>
      inTransaction(client, async () => {
        await client.query(PURGE_EXPIRED_WINDOWS_SQL, [retentionCutoff]);
        const actor =
          actorFingerprint === null
            ? null
            : await client.query(INCREMENT_WINDOW_SQL, [
                attempt.policy,
                "actor",
                actorFingerprint,
                window.windowStartedAt,
              ]);
        const ip = await client.query(INCREMENT_WINDOW_SQL, [
          attempt.policy,
          "ip",
          attempt.ipFingerprint,
          window.windowStartedAt,
        ]);
        return { actorCount: actor === null ? 0 : readCount(actor), ipCount: readCount(ip) };
      }),
    );

    return decideRateLimit({ config, window, nowMs: attempt.nowMs, actorCount, ipCount });
  }
}

async function inTransaction<T>(client: PostgresQueryable, run: () => Promise<T>): Promise<T> {
  await client.query("BEGIN");
  try {
    const result = await run();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
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
