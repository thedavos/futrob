import { RATE_LIMIT_POLICY, type RateLimitPolicy } from "@futrob/api-contracts";
import { TaggedError, type ActorId } from "@futrob/shared-kernel";

/** A `RATE_LIMIT_<POLICY>_*` override is not a positive integer. */
export class RateLimitConfigInvalidError extends TaggedError("RateLimitConfigInvalidError")<{
  code: "rate_limit.config_invalid";
  message: string;
  variable: string;
}> {}

export type RateLimitPolicyConfig = Readonly<{
  windowSeconds: number;
  actorMaxAttempts: number;
  ipMaxAttempts: number;
}>;

export type RateLimitPolicies = Readonly<Record<RateLimitPolicy, RateLimitPolicyConfig>>;

export const DEFAULT_RATE_LIMIT_POLICIES = {
  [RATE_LIMIT_POLICY.eaClubSearch]: {
    windowSeconds: 60,
    actorMaxAttempts: 10,
    ipMaxAttempts: 30,
  },
  [RATE_LIMIT_POLICY.invitationAccept]: {
    windowSeconds: 900,
    actorMaxAttempts: 5,
    ipMaxAttempts: 5,
  },
  [RATE_LIMIT_POLICY.invitationPreview]: {
    windowSeconds: 900,
    actorMaxAttempts: 5,
    ipMaxAttempts: 5,
  },
  // Signed-out landing: counted per IP only, and roomier because visitors reload it.
  [RATE_LIMIT_POLICY.invitationPublicPreview]: {
    windowSeconds: 900,
    actorMaxAttempts: 30,
    ipMaxAttempts: 30,
  },
  [RATE_LIMIT_POLICY.playerSearch]: {
    windowSeconds: 60,
    actorMaxAttempts: 30,
    ipMaxAttempts: 60,
  },
  [RATE_LIMIT_POLICY.publicClubSearch]: {
    windowSeconds: 60,
    actorMaxAttempts: 20,
    ipMaxAttempts: 20,
  },
  [RATE_LIMIT_POLICY.publicCompetitionExplore]: {
    windowSeconds: 60,
    actorMaxAttempts: 30,
    ipMaxAttempts: 30,
  },
} satisfies RateLimitPolicies;

export type RateLimitAttempt = Readonly<{
  policy: RateLimitPolicy;
  /** `null` for a signed-out request, which is counted by IP alone. */
  actorId: ActorId | null;
  ipFingerprint: string;
  nowMs: number;
}>;

export type RateLimitDecision =
  | Readonly<{ outcome: "allowed" }>
  | Readonly<{
      outcome: "limited";
      retryAfterSeconds: number;
      limitedBy: "actor" | "ip";
    }>;

export interface RateLimiter {
  check(attempt: RateLimitAttempt): Promise<RateLimitDecision>;
}

/** Environment prefix of each policy: `<PREFIX>_WINDOW_SECONDS`, `_ACTOR_MAX`, `_IP_MAX`. */
const POLICY_ENV_PREFIX = {
  [RATE_LIMIT_POLICY.eaClubSearch]: "RATE_LIMIT_EA_CLUB_SEARCH",
  [RATE_LIMIT_POLICY.invitationAccept]: "RATE_LIMIT_INVITATION_ACCEPT",
  [RATE_LIMIT_POLICY.invitationPreview]: "RATE_LIMIT_INVITATION_PREVIEW",
  [RATE_LIMIT_POLICY.invitationPublicPreview]: "RATE_LIMIT_INVITATION_PUBLIC_PREVIEW",
  [RATE_LIMIT_POLICY.playerSearch]: "RATE_LIMIT_PLAYER_SEARCH",
  [RATE_LIMIT_POLICY.publicClubSearch]: "RATE_LIMIT_PUBLIC_CLUB_SEARCH",
  [RATE_LIMIT_POLICY.publicCompetitionExplore]: "RATE_LIMIT_PUBLIC_COMPETITION_EXPLORE",
} as const satisfies Record<RateLimitPolicy, string>;

/**
 * Policies from `source` over the defaults. An invalid override keeps that value's
 * default and goes to `onInvalid`, so one typo does not disable the other policies.
 */
export function parseRateLimitPolicies(
  source: Readonly<Record<string, string | undefined>>,
  onInvalid: (error: RateLimitConfigInvalidError) => void,
) {
  const policyFromEnv = (policy: RateLimitPolicy): RateLimitPolicyConfig => {
    const prefix = POLICY_ENV_PREFIX[policy];
    const defaults = DEFAULT_RATE_LIMIT_POLICIES[policy];
    const read = (suffix: string, fallback: number) => {
      const name = `${prefix}_${suffix}`;
      try {
        return positiveInteger(source[name], fallback, name);
      } catch (error) {
        if (!(error instanceof RateLimitConfigInvalidError)) throw error;
        onInvalid(error);
        return fallback;
      }
    };
    return {
      windowSeconds: read("WINDOW_SECONDS", defaults.windowSeconds),
      actorMaxAttempts: read("ACTOR_MAX", defaults.actorMaxAttempts),
      ipMaxAttempts: read("IP_MAX", defaults.ipMaxAttempts),
    };
  };
  return {
    [RATE_LIMIT_POLICY.eaClubSearch]: policyFromEnv(RATE_LIMIT_POLICY.eaClubSearch),
    [RATE_LIMIT_POLICY.invitationAccept]: policyFromEnv(RATE_LIMIT_POLICY.invitationAccept),
    [RATE_LIMIT_POLICY.invitationPreview]: policyFromEnv(RATE_LIMIT_POLICY.invitationPreview),
    [RATE_LIMIT_POLICY.invitationPublicPreview]: policyFromEnv(
      RATE_LIMIT_POLICY.invitationPublicPreview,
    ),
    [RATE_LIMIT_POLICY.playerSearch]: policyFromEnv(RATE_LIMIT_POLICY.playerSearch),
    [RATE_LIMIT_POLICY.publicClubSearch]: policyFromEnv(RATE_LIMIT_POLICY.publicClubSearch),
    [RATE_LIMIT_POLICY.publicCompetitionExplore]: policyFromEnv(
      RATE_LIMIT_POLICY.publicCompetitionExplore,
    ),
  } satisfies RateLimitPolicies;
}

function positiveInteger(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RateLimitConfigInvalidError({
      code: "rate_limit.config_invalid",
      message: `${name} must be a positive integer`,
      variable: name,
    });
  }
  return value;
}

export type RateLimitWindow = Readonly<{ windowMs: number; windowStartedAt: number }>;

/** Fixed window that contains `nowMs` for the policy. */
export function rateLimitWindow(config: RateLimitPolicyConfig, nowMs: number): RateLimitWindow {
  const windowMs = config.windowSeconds * 1000;
  return { windowMs, windowStartedAt: Math.floor(nowMs / windowMs) * windowMs };
}

/** Longest window across policies: older windows can no longer affect a decision. */
export function longestRateLimitWindowMs(policies: RateLimitPolicies): number {
  return Math.max(...Object.values(policies).map((policy) => policy.windowSeconds)) * 1000;
}

/** Decision for the counts after this attempt was added; the actor wins a tie. */
export function decideRateLimit(
  input: Readonly<{
    config: RateLimitPolicyConfig;
    window: RateLimitWindow;
    nowMs: number;
    actorCount: number;
    ipCount: number;
  }>,
): RateLimitDecision {
  const { config, window } = input;
  if (input.actorCount <= config.actorMaxAttempts && input.ipCount <= config.ipMaxAttempts) {
    return { outcome: "allowed" };
  }
  return {
    outcome: "limited",
    limitedBy: input.actorCount > config.actorMaxAttempts ? "actor" : "ip",
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((window.windowStartedAt + window.windowMs - input.nowMs) / 1000),
    ),
  };
}
