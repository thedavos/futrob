import {
  decideRateLimit,
  longestRateLimitWindowMs,
  rateLimitWindow,
  type RateLimitAttempt,
  type RateLimitDecision,
  type RateLimiter,
  type RateLimitPolicies,
} from "./rate-limit-policies.ts";

/**
 * Process-local counters for an API without `DATABASE_URL`, like the other in-memory
 * adapters. Lost on restart and not shared between instances.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { windowStartedAt: number; count: number }>();
  private readonly policies: RateLimitPolicies;
  private readonly maxPolicyWindowMs: number;

  constructor(policies: RateLimitPolicies) {
    this.policies = policies;
    this.maxPolicyWindowMs = longestRateLimitWindowMs(policies);
  }

  async check(attempt: RateLimitAttempt): Promise<RateLimitDecision> {
    const config = this.policies[attempt.policy];
    const window = rateLimitWindow(config, attempt.nowMs);
    const retentionCutoff = attempt.nowMs - this.maxPolicyWindowMs;
    for (const [key, entry] of this.windows) {
      if (entry.windowStartedAt < retentionCutoff) this.windows.delete(key);
    }

    const increment = (subject: string): number => {
      const key = `${attempt.policy}|${subject}|${window.windowStartedAt}`;
      const count = (this.windows.get(key)?.count ?? 0) + 1;
      this.windows.set(key, { windowStartedAt: window.windowStartedAt, count });
      return count;
    };
    const actorCount = attempt.actorId === null ? 0 : increment(`actor:${attempt.actorId}`);
    const ipCount = increment(`ip:${attempt.ipFingerprint}`);
    return decideRateLimit({ config, window, nowMs: attempt.nowMs, actorCount, ipCount });
  }
}
