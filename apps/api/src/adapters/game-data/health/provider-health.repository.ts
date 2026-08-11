import type {
  ProviderHealthEvent,
  ProviderHealthOutcome,
  ProviderHealthPort,
  ProviderHealthSnapshot,
  GameDataProviderKey,
} from "@futrob/game-data";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import type {
  ProviderCircuitBreaker,
  ProviderCircuitState,
} from "@/adapters/game-data/resilience/provider-circuit-breaker.ts";

const HEALTH_WINDOW_MS = 24 * 60 * 60 * 1_000;
const HEALTH_RETENTION_DAYS = 30;
const HEALTH_SAMPLE_LIMIT = 1_000;

const failureOutcomes = new Set<ProviderHealthOutcome>([
  "timeout",
  "network",
  "rate_limited",
  "upstream_4xx",
  "upstream_5xx",
  "schema",
  "circuit_open",
]);

export class InMemoryProviderHealthRepository implements ProviderHealthPort {
  readonly events: ProviderHealthEvent[] = [];

  constructor(
    private readonly circuit?: ProviderCircuitBreaker,
    private readonly clock: { now(): Date } = { now: () => new Date() },
  ) {}

  record(event: ProviderHealthEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }

  async getSnapshot(providerKey: GameDataProviderKey): Promise<ProviderHealthSnapshot> {
    const now = this.clock.now();
    return snapshotFromEvents(providerKey, this.events, {
      now,
      circuitState: await this.circuit?.getProviderState(providerKey, now),
    });
  }
}

export class PostgresProviderHealthRepository implements ProviderHealthPort {
  constructor(
    private readonly pool: Pool,
    private readonly circuit: ProviderCircuitBreaker,
    private readonly clock: { now(): Date },
  ) {}

  async record(event: ProviderHealthEvent): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO provider_health_events (
         id, provider_key, operation, outcome, latency_ms, occurred_at, request_id, job_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        event.id,
        event.providerKey,
        event.operation,
        event.outcome,
        event.latencyMs,
        event.occurredAt.toISOString(),
        event.requestId,
        event.jobId,
      ],
    );
  }

  async getSnapshot(providerKey: GameDataProviderKey): Promise<ProviderHealthSnapshot> {
    const executor = getPgExecutor(this.pool);
    const now = this.clock.now();
    await executor.query(
      `DELETE FROM provider_health_events
       WHERE occurred_at < $1::timestamptz - make_interval(days => $2)`,
      [now.toISOString(), HEALTH_RETENTION_DAYS],
    );
    const result = await executor.query(
      `SELECT id, provider_key, operation, outcome, latency_ms, occurred_at, request_id, job_id
       FROM provider_health_events
       WHERE provider_key = $1 AND occurred_at >= $2
       ORDER BY occurred_at DESC
       LIMIT $3`,
      [providerKey, new Date(now.getTime() - HEALTH_WINDOW_MS).toISOString(), HEALTH_SAMPLE_LIMIT],
    );
    return snapshotFromEvents(
      providerKey,
      result.rows.map((row) => ({
        id: String(row.id),
        providerKey: String(row.provider_key) as GameDataProviderKey,
        operation: String(row.operation),
        outcome: String(row.outcome) as ProviderHealthOutcome,
        latencyMs: Number(row.latency_ms),
        occurredAt: new Date(row.occurred_at),
        requestId: row.request_id ? String(row.request_id) : null,
        jobId: row.job_id ? String(row.job_id) : null,
      })),
      {
        now,
        circuitState: await this.circuit.getProviderState(providerKey, now),
      },
    );
  }
}

export function snapshotFromEvents(
  providerKey: GameDataProviderKey,
  allEvents: readonly ProviderHealthEvent[],
  options: { readonly now?: Date; readonly circuitState?: ProviderCircuitState } = {},
): ProviderHealthSnapshot {
  const providerEvents = allEvents.filter((event) => event.providerKey === providerKey);
  const now =
    options.now ??
    providerEvents.reduce(
      (latest, event) => (event.occurredAt > latest ? event.occurredAt : latest),
      new Date(0),
    );
  const windowStartedAt = new Date(now.getTime() - HEALTH_WINDOW_MS);
  const events = providerEvents
    .filter((event) => event.occurredAt >= windowStartedAt)
    .slice()
    .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  const observedAt = now;
  const successes = events.filter((event) => event.outcome === "success");
  const failures = events.filter((event) => failureOutcomes.has(event.outcome));
  const latestSuccess = successes.at(-1)?.occurredAt ?? null;
  const latestFailure = failures.at(-1)?.occurredAt ?? null;
  const circuitByOperation = new Map<string, ProviderHealthSnapshot["circuitState"]>();
  for (const event of events) {
    if (event.outcome === "circuit_open") circuitByOperation.set(event.operation, "open");
    if (event.outcome === "circuit_half_open") {
      circuitByOperation.set(event.operation, "half_open");
    }
    if (event.outcome === "success") circuitByOperation.set(event.operation, "closed");
  }
  const circuitStates = [...circuitByOperation.values()];
  const circuitState =
    options.circuitState ??
    (circuitStates.includes("open")
      ? "open"
      : circuitStates.includes("half_open")
        ? "half_open"
        : "closed");
  const unavailable = circuitState === "open";
  const degraded = Boolean(
    latestFailure && (!latestSuccess || latestFailure.getTime() > latestSuccess.getTime()),
  );
  const latencyEvents = events.filter(
    (event) => event.outcome === "success" || failureOutcomes.has(event.outcome),
  );
  const averageLatencyMs = latencyEvents.length
    ? Math.round(
        latencyEvents.reduce((total, event) => total + event.latencyMs, 0) / latencyEvents.length,
      )
    : null;

  return {
    providerKey,
    status: unavailable
      ? "unavailable"
      : circuitState === "half_open" || degraded
        ? "degraded"
        : events.length === 0
          ? "unknown"
          : "healthy",
    circuitState,
    observedAt,
    windowStartedAt,
    sampleSize: events.length,
    lastSuccessfulAt: latestSuccess,
    lastFailureAt: latestFailure,
    averageLatencyMs,
    successCount: successes.length,
    failureCount: failures.length,
    cache: {
      hits: events.filter((event) => event.outcome === "cache_hit").length,
      misses: events.filter((event) => event.outcome === "cache_miss").length,
      stale: events.filter((event) => event.outcome === "cache_stale").length,
    },
  };
}
