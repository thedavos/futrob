import type { CheckRateLimitRequest, CheckRateLimitResponse } from "@futrob/api-contracts";
import { asActorId, type ClockPort } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { InMemoryRateLimiter } from "@/adapters/rate-limit/in-memory-rate-limiter.ts";
import {
  PostgresRateLimiter,
  withPoolConnection,
} from "@/adapters/rate-limit/postgres-rate-limiter.ts";
import { fingerprintRateLimitSubject } from "@/adapters/rate-limit/rate-limit-fingerprint.ts";
import {
  DEFAULT_RATE_LIMIT_POLICIES,
  parseRateLimitPolicies,
  type RateLimitConfigInvalidError,
  type RateLimitPolicies,
} from "@/adapters/rate-limit/rate-limit-policies.ts";

export type RateLimitSettings = Readonly<{
  /** HMAC key for actor and IP fingerprints; without it the check is unavailable. */
  fingerprintSecret: string | undefined;
  policies?: RateLimitPolicies;
}>;

/**
 * Secret plus `RATE_LIMIT_<POLICY>_{WINDOW_SECONDS,ACTOR_MAX,IP_MAX}` over the defaults.
 * An invalid override keeps its default and goes to `onInvalid`, which names the variable.
 */
export function rateLimitSettingsFromEnv(
  fingerprintSecret: string | undefined,
  source: Readonly<Record<string, string | undefined>>,
  onInvalid: (error: RateLimitConfigInvalidError) => void,
): RateLimitSettings {
  return { fingerprintSecret, policies: parseRateLimitPolicies(source, onInvalid) };
}

/** Counts one attempt for the web BFF and answers whether it may proceed (ADR-0034). */
export interface RateLimitCheck {
  check(request: CheckRateLimitRequest): Promise<CheckRateLimitResponse>;
}

/** `null` when no fingerprint secret is configured: callers answer 503 and the BFF fails closed. */
export function createRateLimitCheck(
  input: Readonly<{
    pool: Pool | undefined;
    clock: ClockPort;
    settings: RateLimitSettings | undefined;
  }>,
): RateLimitCheck | null {
  const fingerprintSecret = input.settings?.fingerprintSecret;
  if (!fingerprintSecret) return null;
  const policies = input.settings?.policies ?? DEFAULT_RATE_LIMIT_POLICIES;
  const limiter = input.pool
    ? new PostgresRateLimiter({
        withPostgres: withPoolConnection(input.pool),
        fingerprintSecret,
        policies,
      })
    : new InMemoryRateLimiter(policies);

  return {
    async check(request) {
      return limiter.check({
        policy: request.policy,
        actorId: request.actorId === null ? null : asActorId(request.actorId),
        ipFingerprint: await fingerprintRateLimitSubject(fingerprintSecret, "ip", request.clientIp),
        nowMs: input.clock.now().getTime(),
      });
    },
  };
}
