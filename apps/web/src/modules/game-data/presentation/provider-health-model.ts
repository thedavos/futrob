import type { ProviderHealthResponse } from "@futrob/api-contracts";

export type ProviderHealthStatus = ProviderHealthResponse["status"];
export type ProviderCircuitState = ProviderHealthResponse["circuitState"];
export type ProviderHealthBadgeVariant = "approved" | "warning" | "destructive" | "neutral";

export type ProviderHealthView = {
  readonly status: ProviderHealthStatus;
  readonly circuitState: ProviderCircuitState;
  readonly empty: boolean;
  readonly sampleSize: number;
  readonly successRate: number | null;
  readonly averageLatencyMs: number | null;
  readonly successCount: number;
  readonly failureCount: number;
  readonly cacheHitRate: number | null;
  readonly cache: ProviderHealthResponse["cache"];
  readonly observedAt: Date;
  readonly windowStartedAt: Date;
  readonly lastSuccessfulAt: Date | null;
  readonly lastFailureAt: Date | null;
};

export function providerHealthView(health: ProviderHealthResponse): ProviderHealthView {
  const calls = health.successCount + health.failureCount;
  const lookups = health.cache.hits + health.cache.misses + health.cache.stale;
  return {
    status: health.status,
    circuitState: health.circuitState,
    empty: health.sampleSize === 0 && calls === 0 && lookups === 0,
    sampleSize: health.sampleSize,
    successRate: calls === 0 ? null : health.successCount / calls,
    averageLatencyMs: health.averageLatencyMs,
    successCount: health.successCount,
    failureCount: health.failureCount,
    cacheHitRate: lookups === 0 ? null : (health.cache.hits + health.cache.stale) / lookups,
    cache: health.cache,
    observedAt: new Date(health.observedAt),
    windowStartedAt: new Date(health.windowStartedAt),
    lastSuccessfulAt: health.lastSuccessfulAt ? new Date(health.lastSuccessfulAt) : null,
    lastFailureAt: health.lastFailureAt ? new Date(health.lastFailureAt) : null,
  };
}

export function providerStatusBadgeVariant(
  status: ProviderHealthStatus,
): ProviderHealthBadgeVariant {
  switch (status) {
    case "healthy":
      return "approved";
    case "degraded":
      return "warning";
    case "unavailable":
      return "destructive";
    case "unknown":
      return "neutral";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function circuitStateBadgeVariant(state: ProviderCircuitState): ProviderHealthBadgeVariant {
  switch (state) {
    case "closed":
      return "approved";
    case "half_open":
      return "warning";
    case "open":
      return "destructive";
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}
