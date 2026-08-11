import { describe, expect, it } from "vite-plus/test";
import type { ProviderHealthEvent } from "@futrob/game-data";
import { snapshotFromEvents } from "./provider-health.repository.ts";

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
      cache: { hits: 1 },
    });
    expect(JSON.stringify(recovered)).not.toContain("requestId");
    expect(JSON.stringify(recovered)).not.toContain("jobId");
  });
});
