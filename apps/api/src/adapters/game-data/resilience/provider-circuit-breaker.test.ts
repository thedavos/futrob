import { describe, expect, it } from "vite-plus/test";
import { InMemoryProviderCircuitBreaker } from "./provider-circuit-breaker.ts";

describe("InMemoryProviderCircuitBreaker", () => {
  it("opens at the threshold, allows one half-open probe, and closes on recovery", async () => {
    const circuit = new InMemoryProviderCircuitBreaker();
    const failedAt = new Date("2026-08-11T20:00:00.000Z");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await circuit.recordTransientFailure({
        key: "ea-clubs:/clubs/info",
        now: failedAt,
        failureThreshold: 3,
        cooldownMs: 60_000,
      });
    }

    const blocked = await circuit.beforeRequest({
      key: "ea-clubs:/clubs/info",
      now: new Date("2026-08-11T20:00:30.000Z"),
      probeLeaseToken: "probe-a",
      probeLeaseExpiresAt: new Date("2026-08-11T20:00:40.000Z"),
    });
    expect(blocked).toMatchObject({ allowed: false, state: "open", retryAfterMs: 30_000 });

    const probeAt = new Date("2026-08-11T20:01:00.000Z");
    const [probe, concurrent] = await Promise.all([
      circuit.beforeRequest({
        key: "ea-clubs:/clubs/info",
        now: probeAt,
        probeLeaseToken: "probe-a",
        probeLeaseExpiresAt: new Date("2026-08-11T20:01:10.000Z"),
      }),
      circuit.beforeRequest({
        key: "ea-clubs:/clubs/info",
        now: probeAt,
        probeLeaseToken: "probe-b",
        probeLeaseExpiresAt: new Date("2026-08-11T20:01:10.000Z"),
      }),
    ]);
    expect([probe, concurrent].filter((permission) => permission.allowed)).toHaveLength(1);

    await circuit.recordSuccess({ key: "ea-clubs:/clubs/info", now: probeAt });
    await expect(
      circuit.beforeRequest({
        key: "ea-clubs:/clubs/info",
        now: probeAt,
        probeLeaseToken: "probe-c",
        probeLeaseExpiresAt: new Date("2026-08-11T20:01:10.000Z"),
      }),
    ).resolves.toEqual({ allowed: true, state: "closed" });
  });
});
