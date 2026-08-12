import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import {
  BFF_RATE_LIMIT_POLICY,
  DEFAULT_BFF_RATE_LIMIT_POLICIES,
  parseBffRateLimitPolicies,
  type RateLimitAttempt,
  type RateLimitDecision,
} from "./bff-rate-limiter.ts";
import { FakeBffRateLimiter } from "./fake-bff-rate-limiter.ts";

describe("BffRateLimiter contract", () => {
  it("records the policy, actor, IP fingerprint and time for an allowed attempt", async () => {
    const attempt = {
      policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
      actorId: asActorId("actor-1"),
      ipFingerprint: "ip-hmac",
      nowMs: 1710000000000,
    } satisfies RateLimitAttempt;
    const limiter = new FakeBffRateLimiter([{ outcome: "allowed" }]);

    await expect(limiter.check(attempt)).resolves.toEqual({ outcome: "allowed" });
    expect(limiter.attempts).toEqual([attempt]);
  });

  it("returns a typed limited decision with the binding scope and retry delay", async () => {
    const decision = {
      outcome: "limited",
      limitedBy: "ip",
      retryAfterSeconds: 42,
    } satisfies RateLimitDecision;
    const limiter = new FakeBffRateLimiter([decision]);

    await expect(
      limiter.check({
        policy: BFF_RATE_LIMIT_POLICY.invitationAccept,
        actorId: asActorId("actor-2"),
        ipFingerprint: "another-ip-hmac",
        nowMs: 1710000001000,
      }),
    ).resolves.toEqual(decision);
  });

  it("keeps search and invitation defaults independent", () => {
    expect(DEFAULT_BFF_RATE_LIMIT_POLICIES).toEqual({
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
    });
  });

  it("overrides defaults with positive environment integers", () => {
    const policies = parseBffRateLimitPolicies({
      RATE_LIMIT_EA_CLUB_SEARCH_WINDOW_SECONDS: "30",
      RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX: "7",
      RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX: "21",
      RATE_LIMIT_INVITATION_ACCEPT_WINDOW_SECONDS: "600",
      RATE_LIMIT_INVITATION_ACCEPT_ACTOR_MAX: "4",
      RATE_LIMIT_INVITATION_ACCEPT_IP_MAX: "6",
      RATE_LIMIT_INVITATION_PREVIEW_WINDOW_SECONDS: "300",
      RATE_LIMIT_INVITATION_PREVIEW_ACTOR_MAX: "3",
      RATE_LIMIT_INVITATION_PREVIEW_IP_MAX: "9",
    });

    expect(policies[BFF_RATE_LIMIT_POLICY.eaClubSearch]).toEqual({
      windowSeconds: 30,
      actorMaxAttempts: 7,
      ipMaxAttempts: 21,
    });
    expect(policies[BFF_RATE_LIMIT_POLICY.invitationAccept]).toEqual({
      windowSeconds: 600,
      actorMaxAttempts: 4,
      ipMaxAttempts: 6,
    });
    expect(policies[BFF_RATE_LIMIT_POLICY.invitationPreview]).toEqual({
      windowSeconds: 300,
      actorMaxAttempts: 3,
      ipMaxAttempts: 9,
    });
  });

  it.each(["0", "-1", "1.5", "not-a-number"])(
    "rejects invalid policy configuration %s",
    (value) => {
      expect(() =>
        parseBffRateLimitPolicies({ RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX: value }),
      ).toThrow("RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX must be a positive integer");
    },
  );
});
