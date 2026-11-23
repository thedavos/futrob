import { describe, expect, it } from "vite-plus/test";
import { RATE_LIMIT_POLICY } from "@futrob/api-contracts";
import type { ClockPort } from "@futrob/shared-kernel";
import { DEFAULT_RATE_LIMIT_POLICIES } from "@/adapters/rate-limit/rate-limit-policies.ts";
import { rateLimitSettingsFromEnv } from "@/di/rate-limits.composition.ts";
import type { CorrelationLogEntry } from "@/context/request-correlation.ts";
import {
  buildApp,
  buildAppWithModules,
  INTERNAL_JOB_SECRET,
  stubFetch,
} from "../http-app.harness.ts";

const CHECK_URL = "http://localhost/api/v1/internal/rate-limits/check";
const NOW = new Date("2026-03-09T12:00:30.000Z");
const fixedClock: ClockPort = { now: () => NOW };

function configuredApp(logEntries: CorrelationLogEntry[] = []) {
  return buildAppWithModules(stubFetch, logEntries, {
    clock: fixedClock,
    rateLimit: {
      fingerprintSecret: "dedicated-test-secret",
      policies: {
        ...DEFAULT_RATE_LIMIT_POLICIES,
        [RATE_LIMIT_POLICY.eaClubSearch]: {
          windowSeconds: 60,
          actorMaxAttempts: 1,
          ipMaxAttempts: 3,
        },
        [RATE_LIMIT_POLICY.invitationPublicPreview]: {
          windowSeconds: 900,
          actorMaxAttempts: 30,
          ipMaxAttempts: 1,
        },
      },
    },
  }).app;
}

function check(
  app: ReturnType<typeof buildApp>,
  body: unknown,
  headers: Record<string, string> = { Authorization: `Bearer ${INTERNAL_JOB_SECRET}` },
) {
  return app.request(CHECK_URL, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const searchAttempt = {
  policy: RATE_LIMIT_POLICY.eaClubSearch,
  actorId: "actor-1",
  clientIp: "203.0.113.9",
};

describe("POST /internal/rate-limits/check", () => {
  it("rejects a caller without the internal bearer secret", async () => {
    const response = await check(configuredApp(), searchAttempt, {});

    expect(response.status).toBe(401);
  });

  it("answers 503 when no fingerprint secret is configured", async () => {
    const response = await check(buildApp(stubFetch), searchAttempt);

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "api.rate_limit_unavailable" });
  });

  it("keeps checking with the default when one policy override is invalid", async () => {
    const reasons: string[] = [];
    const rateLimit = rateLimitSettingsFromEnv(
      "dedicated-test-secret",
      { RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX: "0" },
      (error) => reasons.push(`${error.code}: ${error.variable}`),
    );
    const { app } = buildAppWithModules(stubFetch, [], { clock: fixedClock, rateLimit });

    const response = await check(app, searchAttempt);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: "allowed" });
    expect(reasons).toEqual(["rate_limit.config_invalid: RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX"]);
  });

  it("rejects an unknown policy", async () => {
    const response = await check(configuredApp(), { ...searchAttempt, policy: "unknown" });

    expect(response.status).toBe(400);
  });

  it("answers 503 and logs the Postgres error code when the store fails", async () => {
    const logEntries: CorrelationLogEntry[] = [];
    const { app } = buildAppWithModules(
      stubFetch,
      logEntries,
      {},
      {
        rateLimits: {
          check: () => Promise.reject(Object.assign(new Error("lock timeout"), { code: "55P03" })),
        },
      },
    );

    const response = await check(app, searchAttempt);

    expect(response.status).toBe(503);
    expect(logEntries).toContainEqual(
      expect.objectContaining({ event: "rate_limit.check_failed", errorCode: "55P03" }),
    );
  });

  it("allows the attempt within the window, then limits the actor until the window ends", async () => {
    const logEntries: CorrelationLogEntry[] = [];
    const app = configuredApp(logEntries);

    const first = await check(app, searchAttempt);
    const second = await check(app, searchAttempt);

    expect(await first.json()).toEqual({ outcome: "allowed" });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({
      outcome: "limited",
      limitedBy: "actor",
      retryAfterSeconds: 30,
    });
    // The BFF already logs allowed checks; the API logs only the limited one.
    expect(logEntries.filter((entry) => entry.event.startsWith("rate_limit."))).toEqual([
      expect.objectContaining({
        event: "rate_limit.limited",
        policy: RATE_LIMIT_POLICY.eaClubSearch,
        limitedBy: "actor",
      }),
    ]);
    expect(JSON.stringify(logEntries)).not.toContain("203.0.113.9");
  });

  it("counts a signed-out attempt by IP alone", async () => {
    const app = configuredApp();
    const anonymous = {
      policy: RATE_LIMIT_POLICY.invitationPublicPreview,
      actorId: null,
      clientIp: "198.51.100.4",
    };

    await check(app, anonymous);
    const second = await check(app, anonymous);
    const otherIp = await check(app, { ...anonymous, clientIp: "198.51.100.5" });

    expect(await second.json()).toMatchObject({ outcome: "limited", limitedBy: "ip" });
    expect(await otherIp.json()).toEqual({ outcome: "allowed" });
  });
});
