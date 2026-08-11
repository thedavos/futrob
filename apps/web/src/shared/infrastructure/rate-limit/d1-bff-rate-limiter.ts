import type { AppD1Database } from "../d1.ts";
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
VALUES (?, ?, ?, ?, 1)
ON CONFLICT (policy, subject_kind, subject_fingerprint, window_started_at)
DO UPDATE SET request_count = request_count + 1
RETURNING request_count
`;

const PURGE_EXPIRED_WINDOWS_SQL = `
DELETE FROM app_rate_limit_windows
WHERE window_started_at < ?
`;

type CounterResult = Readonly<{
  results: readonly Readonly<{ request_count: number }>[];
}>;

export class D1BffRateLimiter implements BffRateLimiter {
  private readonly database: AppD1Database;
  private readonly fingerprintSecret: string;
  private readonly policies: BffRateLimitPolicies;
  private readonly maxPolicyWindowMs: number;

  constructor(
    input: Readonly<{
      database: AppD1Database;
      fingerprintSecret: string;
      policies: BffRateLimitPolicies;
    }>,
  ) {
    this.database = input.database;
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
    const retentionCutoff =
      Math.floor(attempt.nowMs / this.maxPolicyWindowMs) * this.maxPolicyWindowMs;
    const [, actor, ip] = await this.database.batch<CounterResult>([
      this.database.prepare(PURGE_EXPIRED_WINDOWS_SQL).bind(retentionCutoff),
      this.database
        .prepare(INCREMENT_WINDOW_SQL)
        .bind(attempt.policy, "actor", actorFingerprint, windowStartedAt),
      this.database
        .prepare(INCREMENT_WINDOW_SQL)
        .bind(attempt.policy, "ip", attempt.ipFingerprint, windowStartedAt),
    ]);
    const actorCount = readCount(actor);
    const ipCount = readCount(ip);

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

function readCount(result: CounterResult | undefined): number {
  const count = result?.results[0]?.request_count;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1) {
    throw new Error("Rate-limit counter did not return a valid count");
  }
  return count;
}
