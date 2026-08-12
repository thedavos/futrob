import type { ActorId } from "@futrob/shared-kernel";

export const BFF_RATE_LIMIT_POLICY = {
  eaClubSearch: "ea-club-search",
  invitationAccept: "invitation-accept",
  invitationPreview: "invitation-preview",
} as const;

export type BffRateLimitPolicy = (typeof BFF_RATE_LIMIT_POLICY)[keyof typeof BFF_RATE_LIMIT_POLICY];

export type BffRateLimitPolicyConfig = Readonly<{
  windowSeconds: number;
  actorMaxAttempts: number;
  ipMaxAttempts: number;
}>;

export type BffRateLimitPolicies = Readonly<Record<BffRateLimitPolicy, BffRateLimitPolicyConfig>>;

export const DEFAULT_BFF_RATE_LIMIT_POLICIES: BffRateLimitPolicies = {
  [BFF_RATE_LIMIT_POLICY.eaClubSearch]: {
    windowSeconds: 60,
    actorMaxAttempts: 10,
    ipMaxAttempts: 30,
  },
  [BFF_RATE_LIMIT_POLICY.invitationAccept]: {
    windowSeconds: 900,
    actorMaxAttempts: 5,
    ipMaxAttempts: 5,
  },
  [BFF_RATE_LIMIT_POLICY.invitationPreview]: {
    windowSeconds: 900,
    actorMaxAttempts: 5,
    ipMaxAttempts: 5,
  },
};

export type RateLimitAttempt = Readonly<{
  policy: BffRateLimitPolicy;
  actorId: ActorId;
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

export interface BffRateLimiter {
  check(attempt: RateLimitAttempt): Promise<RateLimitDecision>;
}

const POLICY_ENV_KEYS = {
  [BFF_RATE_LIMIT_POLICY.eaClubSearch]: {
    windowSeconds: "RATE_LIMIT_EA_CLUB_SEARCH_WINDOW_SECONDS",
    actorMaxAttempts: "RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX",
    ipMaxAttempts: "RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX",
  },
  [BFF_RATE_LIMIT_POLICY.invitationAccept]: {
    windowSeconds: "RATE_LIMIT_INVITATION_ACCEPT_WINDOW_SECONDS",
    actorMaxAttempts: "RATE_LIMIT_INVITATION_ACCEPT_ACTOR_MAX",
    ipMaxAttempts: "RATE_LIMIT_INVITATION_ACCEPT_IP_MAX",
  },
  [BFF_RATE_LIMIT_POLICY.invitationPreview]: {
    windowSeconds: "RATE_LIMIT_INVITATION_PREVIEW_WINDOW_SECONDS",
    actorMaxAttempts: "RATE_LIMIT_INVITATION_PREVIEW_ACTOR_MAX",
    ipMaxAttempts: "RATE_LIMIT_INVITATION_PREVIEW_IP_MAX",
  },
} as const satisfies Record<
  BffRateLimitPolicy,
  Readonly<{ windowSeconds: string; actorMaxAttempts: string; ipMaxAttempts: string }>
>;

export function parseBffRateLimitPolicies(
  source: Readonly<Record<string, string | undefined>>,
): BffRateLimitPolicies {
  return {
    [BFF_RATE_LIMIT_POLICY.eaClubSearch]: policyFromEnv(source, BFF_RATE_LIMIT_POLICY.eaClubSearch),
    [BFF_RATE_LIMIT_POLICY.invitationAccept]: policyFromEnv(
      source,
      BFF_RATE_LIMIT_POLICY.invitationAccept,
    ),
    [BFF_RATE_LIMIT_POLICY.invitationPreview]: policyFromEnv(
      source,
      BFF_RATE_LIMIT_POLICY.invitationPreview,
    ),
  };
}

function policyFromEnv(
  source: Readonly<Record<string, string | undefined>>,
  policy: BffRateLimitPolicy,
): BffRateLimitPolicyConfig {
  const keys = POLICY_ENV_KEYS[policy];
  const defaults = DEFAULT_BFF_RATE_LIMIT_POLICIES[policy];
  return {
    windowSeconds: positiveInteger(
      source[keys.windowSeconds],
      defaults.windowSeconds,
      keys.windowSeconds,
    ),
    actorMaxAttempts: positiveInteger(
      source[keys.actorMaxAttempts],
      defaults.actorMaxAttempts,
      keys.actorMaxAttempts,
    ),
    ipMaxAttempts: positiveInteger(
      source[keys.ipMaxAttempts],
      defaults.ipMaxAttempts,
      keys.ipMaxAttempts,
    ),
  };
}

function positiveInteger(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}
