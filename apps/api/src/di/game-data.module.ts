import {
  EnqueueProviderSyncJobUseCase,
  ExecuteProviderSyncJobUseCase,
  GetExternalClubUseCase,
  GetPlayerRecentProviderMatchUseCase,
  GetRecentProviderMatchesUseCase,
  GetProviderHealthUseCase,
  ListMatchesBetweenClubsUseCase,
  ListPlayerRecentProviderMatchesUseCase,
  SearchExternalClubsUseCase,
  SyncRecentProviderMatchesUseCase,
  providerRetryDelayMs,
  type GameDataProviderPort,
  type ProviderMatchIngestionPort,
  type ProviderMatchRepository,
  type RawObservationRepository,
  type ProviderSyncJobRepository,
  type ProviderHealthPort,
} from "@futrob/game-data";
import type { ClockPort, IdGeneratorPort, TransactionPort } from "@futrob/shared-kernel";
import { InMemoryGameDataProviderRegistry } from "@/adapters/game-data/internal.ts";
import {
  createRequestCorrelation,
  runWithPersistedJobCorrelation,
} from "@/context/request-correlation.ts";

export interface GameDataModuleDependencies {
  readonly providers: readonly GameDataProviderPort[];
  readonly ingestion: ProviderMatchIngestionPort;
  readonly providerMatches: ProviderMatchRepository;
  readonly rawObservations: RawObservationRepository;
  readonly jobs: ProviderSyncJobRepository;
  readonly ids: IdGeneratorPort;
  readonly clock: ClockPort;
  readonly maxJobAttempts: number;
  readonly transaction: TransactionPort;
  readonly health: ProviderHealthPort;
}

export function createGameDataModule(deps: GameDataModuleDependencies) {
  const registry = new InMemoryGameDataProviderRegistry(deps.providers);

  const syncRecentProviderMatches = new SyncRecentProviderMatchesUseCase({
    ingestions: {
      get: (key) => (deps.ingestion.key === key ? deps.ingestion : null),
    },
    rawObservations: deps.rawObservations,
    matches: deps.providerMatches,
    ids: deps.ids,
    transaction: deps.transaction,
  });

  return {
    searchExternalClubs: new SearchExternalClubsUseCase(registry),
    getExternalClub: new GetExternalClubUseCase(registry),
    getRecentProviderMatches: new GetRecentProviderMatchesUseCase(registry),
    listPlayerRecentProviderMatches: new ListPlayerRecentProviderMatchesUseCase(registry),
    getPlayerRecentProviderMatch: new GetPlayerRecentProviderMatchUseCase(registry),
    getProviderHealth: new GetProviderHealthUseCase(deps.health),
    listMatchesBetweenClubs: new ListMatchesBetweenClubsUseCase(deps.providerMatches),
    syncRecentProviderMatches,
    enqueueProviderSyncJob: new EnqueueProviderSyncJobUseCase({
      jobs: deps.jobs,
      ids: deps.ids,
      clock: deps.clock,
      maxAttempts: deps.maxJobAttempts,
    }),
    executeProviderSyncJob: new ExecuteProviderSyncJobUseCase({
      jobs: deps.jobs,
      sync: {
        execute: (providerKey, input) => syncRecentProviderMatches.execute(providerKey, input),
      },
      ids: deps.ids,
      clock: deps.clock,
      leaseMs: 90_000,
      retryDelayMs: providerRetryDelayMs,
      runClaimed: (job, operation) =>
        runWithPersistedJobCorrelation(createRequestCorrelation(job.requestId), job.id, operation),
    }),
    jobs: deps.jobs,
    registry,
  };
}

export type GameDataModule = ReturnType<typeof createGameDataModule>;
