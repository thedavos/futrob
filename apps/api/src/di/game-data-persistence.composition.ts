import {
  InMemoryProviderMatchRepository,
  InMemoryRawObservationRepository,
} from "@/adapters/game-data/persistence/in-memory.repository.ts";
import {
  PostgresProviderMatchRepository,
  PostgresRawObservationRepository,
} from "@/adapters/game-data/persistence/postgres.repository.ts";
import { InMemoryProviderSyncJobRepository } from "@/adapters/game-data/jobs/in-memory-provider-sync-job.repository.ts";
import { PostgresProviderSyncJobRepository } from "@/adapters/game-data/jobs/postgres-provider-sync-job.repository.ts";
import { InMemoryProviderCircuitBreaker } from "@/adapters/game-data/resilience/provider-circuit-breaker.ts";
import { PostgresProviderCircuitBreaker } from "@/adapters/game-data/resilience/postgres-provider-circuit-breaker.ts";
import {
  InMemoryProviderResponseCache,
  PostgresProviderResponseCache,
} from "@/adapters/game-data/resilience/provider-response-cache.ts";
import {
  InMemoryProviderHealthRepository,
  PostgresProviderHealthRepository,
} from "@/adapters/game-data/health/provider-health.repository.ts";
import type { ProviderMatchRepository } from "@futrob/game-data";
import type { ClockPort } from "@futrob/shared-kernel";
import type { Pool } from "pg";

/** Picks Postgres-backed game-data persistence when a pool is provided; otherwise memory. */
export function createGameDataPersistence(
  pool: Pool | undefined,
  clock: ClockPort,
  providerMatchesOverride?: ProviderMatchRepository,
) {
  const providerMatches =
    providerMatchesOverride ??
    (pool ? new PostgresProviderMatchRepository(pool) : new InMemoryProviderMatchRepository());
  const rawObservations = pool
    ? new PostgresRawObservationRepository(pool)
    : new InMemoryRawObservationRepository();
  const providerSyncJobs = pool
    ? new PostgresProviderSyncJobRepository(pool)
    : new InMemoryProviderSyncJobRepository();
  const providerCircuit = pool
    ? new PostgresProviderCircuitBreaker(pool)
    : new InMemoryProviderCircuitBreaker();
  const providerCache = pool
    ? new PostgresProviderResponseCache(pool)
    : new InMemoryProviderResponseCache();
  const providerHealth = pool
    ? new PostgresProviderHealthRepository(pool, providerCircuit, clock)
    : new InMemoryProviderHealthRepository(providerCircuit, clock);
  return {
    providerMatches,
    rawObservations,
    providerSyncJobs,
    providerCircuit,
    providerCache,
    providerHealth,
  };
}
