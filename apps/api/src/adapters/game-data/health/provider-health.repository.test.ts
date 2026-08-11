import { describe, expect, it } from "vite-plus/test";
import type { ProviderHealthEvent } from "@futrob/game-data";
import {
  InMemoryProviderHealthRepository,
  snapshotFromEvents,
} from "./provider-health.repository.ts";
import { InMemoryProviderCircuitBreaker } from "@/adapters/game-data/resilience/provider-circuit-breaker.ts";

function event(outcome: ProviderHealthEvent["outcome"], occurredAt: string): ProviderHealthEvent {
  return {
    id: `${outcome}-${occurredAt}`,
    providerKey: "ea-clubs",
    operation: "/clubs/info",
    outcome,
    latencyMs: 100,
    occurredAt: new Date(occurredAt),
    requestId: null,
    jobId: null,
  };
}

describe("snapshotFromEvents", () => {
  it("shows degradation, open circuit, and later recovery without sensitive fields", () => {
    const degraded = snapshotFromEvents("ea-clubs", [
      event("success", "2026-08-11T20:00:00.000Z"),
      event("upstream_5xx", "2026-08-11T20:01:00.000Z"),
    ]);
    const unavailable = snapshotFromEvents("ea-clubs", [
      event("success", "2026-08-11T20:00:00.000Z"),
      event("circuit_open", "2026-08-11T20:01:00.000Z"),
    ]);
    const recovered = snapshotFromEvents("ea-clubs", [
      event("circuit_open", "2026-08-11T20:01:00.000Z"),
      event("success", "2026-08-11T20:02:00.000Z"),
      event("cache_hit", "2026-08-11T20:02:01.000Z"),
    ]);

    expect(degraded.status).toBe("degraded");
    expect(unavailable).toMatchObject({ status: "unavailable", circuitState: "open" });
    expect(
      snapshotFromEvents("ea-clubs", [event("circuit_half_open", "2026-08-11T20:01:00.000Z")]),
    ).toMatchObject({ status: "degraded", circuitState: "half_open" });
    expect(recovered).toMatchObject({
      status: "healthy",
      circuitState: "closed",
      sampleSize: 3,
      cache: { hits: 1 },
    });
    expect(JSON.stringify(recovered)).not.toContain("requestId");
    expect(JSON.stringify(recovered)).not.toContain("jobId");
  });

  it("reports an expired open circuit as ready for a half-open probe", async () => {
    const circuit = new InMemoryProviderCircuitBreaker();
    await circuit.recordTransientFailure({
      key: "ea-clubs:/clubs/info",
      now: new Date("2026-08-11T20:00:00.000Z"),
      failureThreshold: 1,
      cooldownMs: 60_000,
    });
    const health = new InMemoryProviderHealthRepository(circuit, {
      now: () => new Date("2026-08-11T20:01:01.000Z"),
    });
    await health.record(event("circuit_open", "2026-08-11T20:00:00.000Z"));

    await expect(health.getSnapshot("ea-clubs")).resolves.toMatchObject({
      status: "degraded",
      circuitState: "half_open",
      windowStartedAt: new Date("2026-08-10T20:01:01.000Z"),
      sampleSize: 1,
    });
  });
});
