import { z } from "zod";
import type { PostgresQueryable, PostgresQueryResult, WithPostgres } from "../postgres.ts";
import type {
  BffRateLimiter,
  BffRateLimitPolicies,
  RateLimitAttempt,
  RateLimitDecision,
} from "./bff-rate-limiter.ts";
import { fingerprintRateLimitSubject } from "./rate-limit-fingerprint.ts";

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

const PURGE_EXPIRED_WINDOWS_SQL = `
DELETE FROM app_rate_limit_windows
WHERE window_started_at < $1
`;

const requestCountSchema = z.object({ request_count: z.number().int().min(1) });

export class PostgresBffRateLimiter implements BffRateLimiter {
  private readonly withPostgres: WithPostgres;
  private readonly fingerprintSecret: string;
  private readonly policies: BffRateLimitPolicies;
  private readonly maxPolicyWindowMs: number;

  constructor(
    input: Readonly<{
      withPostgres: WithPostgres;
      fingerprintSecret: string;
      policies: BffRateLimitPolicies;
    }>,
  ) {
    this.withPostgres = input.withPostgres;
    this.fingerprintSecret = input.fingerprintSecret;
    this.policies = input.policies;
    this.maxPolicyWindowMs =
      Math.max(...Object.values(input.policies).map((policy) => policy.windowSeconds)) * 1000;
  }

  async check(attempt: RateLimitAttempt): Promise<RateLimitDecision> {
    if (!/^[a-f0-9]{64}$/.test(attempt.ipFingerprint)) {
      throw new Error("Rate-limit IP fingerprint must be a SHA-256 hex digest");
    }
    const config = this.policies[attempt.policy];
    const windowMs = config.windowSeconds * 1000;
    const windowStartedAt = Math.floor(attempt.nowMs / windowMs) * windowMs;
    const actorFingerprint = await fingerprintRateLimitSubject(
      this.fingerprintSecret,
      "actor",
      attempt.actorId,
    );
    const retentionCutoff = attempt.nowMs - this.maxPolicyWindowMs;

    // Purge and both counters commit together, in a fixed order so concurrent
    // checks serialize on the same rows instead of deadlocking.
    const { actorCount, ipCount } = await this.withPostgres((client) =>
      inTransaction(client, async () => {
        await client.query(PURGE_EXPIRED_WINDOWS_SQL, [retentionCutoff]);
        const actor = await client.query(INCREMENT_WINDOW_SQL, [
          attempt.policy,
          "actor",
          actorFingerprint,
          windowStartedAt,
        ]);
        const ip = await client.query(INCREMENT_WINDOW_SQL, [
          attempt.policy,
          "ip",
          attempt.ipFingerprint,
          windowStartedAt,
        ]);
        return { actorCount: readCount(actor), ipCount: readCount(ip) };
      }),
    );

    if (actorCount <= config.actorMaxAttempts && ipCount <= config.ipMaxAttempts) {
      return { outcome: "allowed" };
    }

    return {
      outcome: "limited",
      limitedBy: actorCount > config.actorMaxAttempts ? "actor" : "ip",
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((windowStartedAt + windowMs - attempt.nowMs) / 1000),
      ),
    };
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
