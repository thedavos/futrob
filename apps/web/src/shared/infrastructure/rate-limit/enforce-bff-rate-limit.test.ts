import { describe, expect, it, vi } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { BFF_RATE_LIMIT_POLICY } from "./bff-rate-limiter.ts";
import { enforceBffRateLimit } from "./enforce-bff-rate-limit.ts";
import { FakeBffRateLimiter } from "./fake-bff-rate-limiter.ts";

const requestId = "50b3fc36-1e63-4dd8-8601-2c0826b15a1d";

describe("enforceBffRateLimit", () => {
  it("uses only CF-Connecting-IP and returns the typed 429 response", async () => {
    const limiter = new FakeBffRateLimiter([
      { outcome: "limited", limitedBy: "ip", retryAfterSeconds: 37 },
    ]);
    const logger = { info: vi.fn<(entry: unknown) => void>() };
    const response = await enforceBffRateLimit(
      {
        request: new Request("https://futrob.test/api/v1/game-data/clubs/search?query=secret", {
          headers: {
            "CF-Connecting-IP": "203.0.113.10",
            "X-Forwarded-For": "198.51.100.9",
          },
        }),
        actorId: asActorId("sensitive-actor"),
        requestId,
        policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
      },
      {
        limiter,
        fingerprintSecret: "dedicated-secret",
        environment: "test",
        now: () => 1_710_000_000_000,
        logger,
      },
    );

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("37");
    expect(await response?.json()).toEqual({
      code: "api.rate_limited",
      messageKey: "errors.api.rate_limited",
      requestId,
      retryAfterSeconds: 37,
    });
    expect(limiter.attempts[0]).toMatchObject({
      actorId: asActorId("sensitive-actor"),
      nowMs: 1_710_000_000_000,
      policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
    });
    expect(limiter.attempts[0]?.ipFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(logger.info.mock.calls)).toBe(
      JSON.stringify([
        [
          {
            event: "bff.rate_limit.checked",
            environment: "test",
            limitedBy: "ip",
            outcome: "limited",
            policy: "ea-club-search",
            requestId,
            retryAfterSeconds: 37,
          },
        ],
      ]),
    );
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain("sensitive-actor");
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain("secret");
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain("203.0.113.10");
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain("198.51.100.9");
  });

  it("allows without a response and emits a sanitized allowed event", async () => {
    const limiter = new FakeBffRateLimiter();
    const logger = { info: vi.fn<(entry: unknown) => void>() };

    await expect(
      enforceBffRateLimit(
        {
          request: new Request("https://futrob.test/api/v1/roster-invitations/accept", {
            headers: { "CF-Connecting-IP": "203.0.113.11" },
          }),
          actorId: asActorId("actor-2"),
          requestId,
          policy: BFF_RATE_LIMIT_POLICY.invitationAccept,
        },
        {
          limiter,
          fingerprintSecret: "dedicated-secret",
          environment: "test",
          now: () => 1000,
          logger,
        },
      ),
    ).resolves.toBeUndefined();
    expect(logger.info).toHaveBeenCalledWith({
      event: "bff.rate_limit.checked",
      environment: "test",
      outcome: "allowed",
      policy: "invitation-accept",
      requestId,
    });
  });
});
