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

    const allowedProbe = [probe, concurrent].find((permission) => permission.allowed);
    if (!allowedProbe?.allowed || allowedProbe.state !== "half_open") {
      throw new TypeError("expected half-open probe");
    }
    await circuit.recordSuccess({
      key: "ea-clubs:/clubs/info",
      now: probeAt,
      probeLeaseToken: allowedProbe.probeLeaseToken,
    });
    await expect(
      circuit.beforeRequest({
        key: "ea-clubs:/clubs/info",
        now: probeAt,
        probeLeaseToken: "probe-c",
        probeLeaseExpiresAt: new Date("2026-08-11T20:01:10.000Z"),
      }),
    ).resolves.toEqual({ allowed: true, state: "closed" });
  });

  it("ignores a success from an expired half-open probe", async () => {
    const circuit = new InMemoryProviderCircuitBreaker();
    const key = "ea-clubs:/clubs/info";
    const failedAt = new Date("2026-08-11T20:00:00.000Z");
    await circuit.recordTransientFailure({
      key,
      now: failedAt,
      failureThreshold: 1,
      cooldownMs: 1_000,
    });
    const first = await circuit.beforeRequest({
      key,
      now: new Date("2026-08-11T20:00:01.000Z"),
      probeLeaseToken: "probe-a",
      probeLeaseExpiresAt: new Date("2026-08-11T20:00:02.000Z"),
    });
    const second = await circuit.beforeRequest({
      key,
      now: new Date("2026-08-11T20:00:02.000Z"),
      probeLeaseToken: "probe-b",
      probeLeaseExpiresAt: new Date("2026-08-11T20:00:03.000Z"),
    });
    if (!first.allowed || first.state !== "half_open") throw new TypeError("missing first probe");
    if (!second.allowed || second.state !== "half_open")
      throw new TypeError("missing second probe");

    await circuit.recordTransientFailure({
      key,
      now: new Date("2026-08-11T20:00:02.100Z"),
      failureThreshold: 1,
      cooldownMs: 60_000,
      probeLeaseToken: second.probeLeaseToken,
    });
    await circuit.recordSuccess({
      key,
      now: new Date("2026-08-11T20:00:02.200Z"),
      probeLeaseToken: first.probeLeaseToken,
    });

    await expect(
      circuit.beforeRequest({
        key,
        now: new Date("2026-08-11T20:00:03.000Z"),
        probeLeaseToken: "probe-c",
        probeLeaseExpiresAt: new Date("2026-08-11T20:00:04.000Z"),
      }),
    ).resolves.toMatchObject({ allowed: false, state: "open" });
  });
});
