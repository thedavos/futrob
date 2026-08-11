import { describe, expect, it } from "vite-plus/test";
import { EaClubsHttpClient } from "./ea-clubs-http.ts";
import { InMemoryProviderCircuitBreaker } from "@/adapters/game-data/resilience/provider-circuit-breaker.ts";

describe("EaClubsHttpClient resilience", () => {
  it("retries transient responses with backoff and then records recovery", async () => {
    const responses = [503, 503, 200];
    const sleeps: number[] = [];
    const circuitEvents: string[] = [];
    const client = new EaClubsHttpClient({
      fetcher: (async () => {
        const status = responses.shift() ?? 500;
        return Response.json(status === 200 ? { ok: true } : { secret: "do-not-log" }, {
          status,
        });
      }) as typeof fetch,
      baseUrl: "https://example.test",
      timeoutMs: 1_000,
      retry: {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1_000,
        sleep: async (delayMs) => {
          sleeps.push(delayMs);
        },
        random: () => 0.5,
      },
      circuit: {
        beforeRequest: async () => ({ allowed: true as const, state: "closed" as const }),
        recordSuccess: async () => {
          circuitEvents.push("success");
        },
        recordTransientFailure: async () => {
          circuitEvents.push("failure");
        },
      },
      clock: { now: () => new Date("2026-08-11T20:00:00.000Z") },
    });

    const result = await client.getJson("/clubs/info", { clubIds: "10754" });

    expect(result.isOk()).toBe(true);
    expect(sleeps).toEqual([50, 100]);
    expect(circuitEvents).toEqual(["success"]);
  });

  it("does not retry permanent 4xx responses", async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const client = new EaClubsHttpClient({
      fetcher: (async () => {
        calls += 1;
        return Response.json({}, { status: 404 });
      }) as typeof fetch,
      baseUrl: "https://example.test",
      timeoutMs: 1_000,
      retry: {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1_000,
        sleep: async (delayMs) => {
          sleeps.push(delayMs);
        },
        random: () => 0.5,
      },
    });

    expect((await client.getJson("/clubs/info", {})).isOk()).toBe(false);
    expect(calls).toBe(1);
    expect(sleeps).toEqual([]);
  });

  it("respects Retry-After before retrying a rate-limited response", async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const client = new EaClubsHttpClient({
      fetcher: (async () => {
        calls += 1;
        return calls === 1
          ? Response.json({}, { status: 429, headers: { "Retry-After": "2" } })
          : Response.json({ ok: true });
      }) as typeof fetch,
      baseUrl: "https://example.test",
      timeoutMs: 1_000,
      retry: {
        maxAttempts: 2,
        baseDelayMs: 100,
        maxDelayMs: 1_000,
        sleep: async (delayMs) => {
          sleeps.push(delayMs);
        },
        random: () => 0,
      },
    });

    expect((await client.getJson("/clubs/info", {})).isOk()).toBe(true);
    expect(sleeps).toEqual([2_000]);
  });

  it("opens the shared circuit after final transient failures", async () => {
    let calls = 0;
    const circuit = new InMemoryProviderCircuitBreaker();
    const client = new EaClubsHttpClient({
      fetcher: (async () => {
        calls += 1;
        return Response.json({}, { status: 503 });
      }) as typeof fetch,
      baseUrl: "https://example.test",
      timeoutMs: 1_000,
      retry: {
        maxAttempts: 1,
        baseDelayMs: 100,
        maxDelayMs: 1_000,
        sleep: async () => undefined,
        random: () => 0,
      },
      circuit,
      clock: { now: () => new Date("2026-08-11T20:00:00.000Z") },
    });

    await client.getJson("/clubs/info", {});
    await client.getJson("/clubs/info", {});
    await client.getJson("/clubs/info", {});
    const blocked = await client.getJson("/clubs/info", {});

    expect(blocked.isOk()).toBe(false);
    expect(calls).toBe(3);
  });
});
