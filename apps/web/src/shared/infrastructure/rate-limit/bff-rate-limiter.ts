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

/**
 * Gives up on a stalled API quickly: the check runs before every limited route. Longer
 * than the API's own budget (about 2 s), so the API gives up first and a request refused
 * here is not counted afterwards.
 */
export const RATE_LIMIT_CHECK_TIMEOUT_MS = 3_000;

/**
 * Asks the product API (`POST /internal/rate-limits/check`) with the service secret. A
 * timeout rejects like any other failure, so the BFF fails closed with a 503.
 */
export function productApiRateLimiter(
  client: Pick<FutrobClient, "rateLimits">,
  timeoutMs: number = RATE_LIMIT_CHECK_TIMEOUT_MS,
): BffRateLimiter {
  return { check: (attempt) => client.rateLimits.check(attempt, { timeoutMs }) };
}
