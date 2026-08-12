import type { BffRateLimiter, RateLimitAttempt, RateLimitDecision } from "./bff-rate-limiter.ts";

export class FakeBffRateLimiter implements BffRateLimiter {
  readonly attempts: RateLimitAttempt[] = [];
  private readonly decisions: RateLimitDecision[];

  constructor(decisions: readonly RateLimitDecision[] = []) {
    this.decisions = [...decisions];
  }

  async check(attempt: RateLimitAttempt): Promise<RateLimitDecision> {
    this.attempts.push(attempt);
    return this.decisions.shift() ?? { outcome: "allowed" };
  }
}
