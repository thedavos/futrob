import type { GameDataProviderKey } from "../value-objects/provider-key.ts";

export type ProviderHealthOutcome =
  | "success"
  | "timeout"
  | "network"
  | "rate_limited"
  | "upstream_4xx"
  | "upstream_5xx"
  | "schema"
  | "circuit_open"
  | "circuit_half_open"
  | "cache_hit"
  | "cache_miss"
  | "cache_stale";

export interface ProviderHealthEvent {
  readonly id: string;
  readonly providerKey: GameDataProviderKey;
  readonly operation: string;
  readonly outcome: ProviderHealthOutcome;
  readonly latencyMs: number;
  readonly occurredAt: Date;
  readonly requestId: string | null;
  readonly jobId: string | null;
}

export interface ProviderHealthSnapshot {
  readonly providerKey: GameDataProviderKey;
  readonly status: "healthy" | "degraded" | "unavailable" | "unknown";
  readonly circuitState: "closed" | "open" | "half_open";
  readonly observedAt: Date;
  readonly lastSuccessfulAt: Date | null;
  readonly lastFailureAt: Date | null;
  readonly averageLatencyMs: number | null;
  readonly successCount: number;
  readonly failureCount: number;
  readonly cache: {
    readonly hits: number;
    readonly misses: number;
    readonly stale: number;
  };
}
