import {
  RATE_LIMIT_POLICY,
  type CheckRateLimitRequest,
  type CheckRateLimitResponse,
  type RateLimitPolicy,
} from "@futrob/api-contracts";
import type { FutrobClient } from "@futrob/sdk";

/** Policies live in the product API, which owns the counters (ADR-0034). */
export const BFF_RATE_LIMIT_POLICY = RATE_LIMIT_POLICY;

export type BffRateLimitPolicy = RateLimitPolicy;

/** One attempt: the raw client IP goes to the API, which stores only its HMAC. */
export type RateLimitAttempt = CheckRateLimitRequest;

export type RateLimitDecision = CheckRateLimitResponse;

export interface BffRateLimiter {
  check(attempt: RateLimitAttempt): Promise<RateLimitDecision>;
}

/** Asks the product API (`POST /internal/rate-limits/check`) with the service secret. */
export function productApiRateLimiter(client: Pick<FutrobClient, "rateLimits">): BffRateLimiter {
  return { check: (attempt) => client.rateLimits.check(attempt) };
}
