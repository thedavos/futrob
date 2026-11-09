import { describe, expect, it } from "vite-plus/test";
import type { ProviderHealthResponse } from "@futrob/api-contracts";
import {
  circuitStateBadgeVariant,
  providerHealthView,
  providerStatusBadgeVariant,
} from "./provider-health-model.ts";

const base: ProviderHealthResponse = {
  providerKey: "ea-clubs",
  status: "healthy",
  circuitState: "closed",
  observedAt: "2026-10-28T12:00:00.000Z",
  windowStartedAt: "2026-10-28T11:00:00.000Z",
  sampleSize: 10,
  lastSuccessfulAt: "2026-10-28T11:59:00.000Z",
  lastFailureAt: null,
  averageLatencyMs: 120,
  successCount: 9,
  failureCount: 1,
  cache: { hits: 6, misses: 2, stale: 2 },
};

describe("providerHealthView", () => {
  it("derives success and cache hit rates, counting stale answers as hits", () => {
    const view = providerHealthView(base);
    expect(view.successRate).toBeCloseTo(0.9);
    expect(view.cacheHitRate).toBeCloseTo(0.8);
    expect(view.empty).toBe(false);
    expect(view.lastSuccessfulAt).toEqual(new Date("2026-10-28T11:59:00.000Z"));
    expect(view.lastFailureAt).toBeNull();
  });

  it("reports absent rates as null instead of an invented zero", () => {
    const view = providerHealthView({
      ...base,
      sampleSize: 0,
      successCount: 0,
      failureCount: 0,
      averageLatencyMs: null,
      lastSuccessfulAt: null,
      cache: { hits: 0, misses: 0, stale: 0 },
      status: "unknown",
    });
    expect(view.empty).toBe(true);
    expect(view.successRate).toBeNull();
    expect(view.cacheHitRate).toBeNull();
    expect(view.averageLatencyMs).toBeNull();
  });

  it("is not empty when only cache traffic was observed", () => {
    const view = providerHealthView({
      ...base,
      sampleSize: 0,
      successCount: 0,
      failureCount: 0,
      cache: { hits: 1, misses: 0, stale: 0 },
    });
    expect(view.empty).toBe(false);
  });
});

describe("badge variants", () => {
  it("maps every status and circuit state to a tone", () => {
    expect(providerStatusBadgeVariant("healthy")).toBe("approved");
    expect(providerStatusBadgeVariant("degraded")).toBe("warning");
    expect(providerStatusBadgeVariant("unavailable")).toBe("destructive");
    expect(providerStatusBadgeVariant("unknown")).toBe("neutral");
    expect(circuitStateBadgeVariant("closed")).toBe("approved");
    expect(circuitStateBadgeVariant("half_open")).toBe("warning");
    expect(circuitStateBadgeVariant("open")).toBe("destructive");
  });
});
