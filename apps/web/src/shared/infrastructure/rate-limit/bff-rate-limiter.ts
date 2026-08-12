import type { ActorId } from "@futrob/shared-kernel";

export const BFF_RATE_LIMIT_POLICY = {
  eaClubSearch: "ea-club-search",
  invitationAccept: "invitation-accept",
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

export function parseBffRateLimitPolicies(
  source: Readonly<Record<string, string | undefined>>,
): BffRateLimitPolicies {
  return {
    [BFF_RATE_LIMIT_POLICY.eaClubSearch]: {
      windowSeconds: positiveInteger(
        source.RATE_LIMIT_EA_CLUB_SEARCH_WINDOW_SECONDS,
        DEFAULT_BFF_RATE_LIMIT_POLICIES[BFF_RATE_LIMIT_POLICY.eaClubSearch].windowSeconds,
        "RATE_LIMIT_EA_CLUB_SEARCH_WINDOW_SECONDS",
      ),
      actorMaxAttempts: positiveInteger(
        source.RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX,
        DEFAULT_BFF_RATE_LIMIT_POLICIES[BFF_RATE_LIMIT_POLICY.eaClubSearch].actorMaxAttempts,
        "RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX",
      ),
      ipMaxAttempts: positiveInteger(
        source.RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX,
        DEFAULT_BFF_RATE_LIMIT_POLICIES[BFF_RATE_LIMIT_POLICY.eaClubSearch].ipMaxAttempts,
        "RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX",
      ),
    },
    [BFF_RATE_LIMIT_POLICY.invitationAccept]: {
      windowSeconds: positiveInteger(
        source.RATE_LIMIT_INVITATION_ACCEPT_WINDOW_SECONDS,
        DEFAULT_BFF_RATE_LIMIT_POLICIES[BFF_RATE_LIMIT_POLICY.invitationAccept].windowSeconds,
        "RATE_LIMIT_INVITATION_ACCEPT_WINDOW_SECONDS",
      ),
      actorMaxAttempts: positiveInteger(
        source.RATE_LIMIT_INVITATION_ACCEPT_ACTOR_MAX,
        DEFAULT_BFF_RATE_LIMIT_POLICIES[BFF_RATE_LIMIT_POLICY.invitationAccept].actorMaxAttempts,
        "RATE_LIMIT_INVITATION_ACCEPT_ACTOR_MAX",
      ),
      ipMaxAttempts: positiveInteger(
        source.RATE_LIMIT_INVITATION_ACCEPT_IP_MAX,
        DEFAULT_BFF_RATE_LIMIT_POLICIES[BFF_RATE_LIMIT_POLICY.invitationAccept].ipMaxAttempts,
        "RATE_LIMIT_INVITATION_ACCEPT_IP_MAX",
      ),
    },
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
