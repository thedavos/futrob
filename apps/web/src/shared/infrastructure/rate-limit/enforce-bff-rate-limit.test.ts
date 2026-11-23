import { describe, expect, it, vi } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import {
  BFF_RATE_LIMIT_POLICY,
  RATE_LIMIT_CHECK_TIMEOUT_MS,
  type BffRateLimiter,
} from "./bff-rate-limiter.ts";
import {
  BffRateLimitUnavailableError,
  enforceBffRateLimit,
  shouldBypassBffRateLimit,
  type RateLimitLogEntry,
} from "./enforce-bff-rate-limit.ts";
import { FakeBffRateLimiter } from "./fake-bff-rate-limiter.ts";

const requestId = "50b3fc36-1e63-4dd8-8601-2c0826b15a1d";

describe("enforceBffRateLimit", () => {
  it("uses only CF-Connecting-IP and returns the typed 429 response", async () => {
    const limiter = new FakeBffRateLimiter([
      { outcome: "limited", limitedBy: "ip", retryAfterSeconds: 37 },
    ]);
    const logger = { info: vi.fn<(entry: RateLimitLogEntry) => void>() };
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
      { limiter, environment: "test", logger },
    );

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("37");
    expect(await response?.json()).toEqual({
      code: "api.rate_limited",
      messageKey: "errors.api.rate_limited",
      requestId,
      retryAfterSeconds: 37,
    });
    expect(limiter.attempts).toEqual([
      {
        actorId: asActorId("sensitive-actor"),
        clientIp: "203.0.113.10",
        policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
      },
    ]);
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
    const logger = { info: vi.fn<(entry: RateLimitLogEntry) => void>() };

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
        { limiter, environment: "test", logger },
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

  it("bypasses enforcement in development without requiring the Cloudflare IP", async () => {
    const limiter = new FakeBffRateLimiter();

    await expect(
      enforceBffRateLimit(
        {
          request: new Request("https://futrob.test/api/v1/game-data/clubs/search"),
          actorId: asActorId("actor-2"),
          requestId,
          policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
        },
        { limiter, environment: "development" },
      ),
    ).resolves.toBeUndefined();
    expect(limiter.attempts).toHaveLength(0);
    expect(shouldBypassBffRateLimit("development")).toBe(true);
    expect(shouldBypassBffRateLimit("production")).toBe(false);
  });

  it("fails closed before the limiter without the Cloudflare client IP", async () => {
    const limiter = new FakeBffRateLimiter();

    await expect(
      enforceBffRateLimit(
        {
          request: new Request("https://futrob.test/api/v1/game-data/clubs/search"),
          actorId: asActorId("actor-2"),
          requestId,
          policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
        },
        { limiter, environment: "test" },
      ),
    ).rejects.toBeInstanceOf(BffRateLimitUnavailableError);
    expect(limiter.attempts).toHaveLength(0);
  });

  it("fails closed without the service secret the API check needs", async () => {
    await expect(
      enforceBffRateLimit(
        {
          request: searchRequest(),
          actorId: null,
          requestId,
          policy: BFF_RATE_LIMIT_POLICY.publicClubSearch,
        },
        { environment: "test", bindings: { INTERNAL_JOB_SECRET: "" } },
      ),
    ).rejects.toBeInstanceOf(BffRateLimitUnavailableError);
  });

  it("asks the product API with the service secret and the client IP", async () => {
    const calls: Request[] = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      calls.push(new Request(input, init));
      return Response.json({ outcome: "limited", limitedBy: "ip", retryAfterSeconds: 12 });
    });

    try {
      const response = await enforceBffRateLimit(
        {
          request: searchRequest(),
          actorId: null,
          requestId,
          policy: BFF_RATE_LIMIT_POLICY.publicClubSearch,
        },
        {
          environment: "test",
          logger: { info: () => undefined },
          bindings: {
            INTERNAL_JOB_SECRET: "service-secret",
            FUTROB_API_BASE_URL: "https://api.futrob.test/api/v1",
          },
        },
      );

      expect(response?.status).toBe(429);
      expect(calls).toHaveLength(1);
      const [call] = calls;
      expect(call?.method).toBe("POST");
      expect(call?.url).toBe("https://api.futrob.test/api/v1/internal/rate-limits/check");
      expect(call?.headers.get("Authorization")).toBe("Bearer service-secret");
      expect(await call?.json()).toEqual({
        policy: "public-club-search",
        actorId: null,
        clientIp: "203.0.113.12",
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("fails closed when the product API does not answer in time", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );

    try {
      const outcome = enforceBffRateLimit(
        {
          request: searchRequest(),
          actorId: null,
          requestId,
          policy: BFF_RATE_LIMIT_POLICY.publicClubSearch,
        },
        {
          environment: "test",
          bindings: {
            INTERNAL_JOB_SECRET: "service-secret",
            FUTROB_API_BASE_URL: "https://api.futrob.test/api/v1",
          },
        },
      );
      const rejected = expect(outcome).rejects.toBeInstanceOf(BffRateLimitUnavailableError);
      await vi.advanceTimersByTimeAsync(RATE_LIMIT_CHECK_TIMEOUT_MS);

      await rejected;
    } finally {
      fetchSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it("fails closed when the product API cannot answer", async () => {
    const limiter: BffRateLimiter = {
      check: () => Promise.reject(new Error("503 from the product API")),
    };

    await expect(
      enforceBffRateLimit(
        {
          request: searchRequest(),
          actorId: asActorId("actor-3"),
          requestId,
          policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
        },
        { limiter, environment: "test" },
      ),
    ).rejects.toBeInstanceOf(BffRateLimitUnavailableError);
  });
});

function searchRequest() {
  return new Request("https://futrob.test/api/v1/public/game-data/clubs/search", {
    headers: { "CF-Connecting-IP": "203.0.113.12" },
  });
}
