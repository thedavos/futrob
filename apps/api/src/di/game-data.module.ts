import {
  EnqueueDueProviderSyncsUseCase,
  EnqueueProviderSyncJobUseCase,
  ExecuteProviderSyncJobUseCase,
  GetExternalClubUseCase,
  GetPlayerGameProfileUseCase,
  GetPlayerRecentProviderMatchUseCase,
  GetRecentProviderMatchesUseCase,
  GetProviderHealthUseCase,
  ListMatchesBetweenClubsUseCase,
  ListPlayerRecentProviderMatchesUseCase,
  SearchExternalClubsUseCase,
  SyncRecentProviderMatchesUseCase,
  providerRetryDelayMs,
  providerSyncRetryDelayMs,
  type GameDataProviderPort,
  type ProviderMatchIngestionPort,
  type ProviderMatchRepository,
  type RawObservationRepository,
  type ProviderSyncJobRepository,
  type ProviderSyncQuotaPort,
  type ProviderHealthPort,
} from "@futrob/game-data";
import type { ClockPort, IdGeneratorPort, TransactionPort } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import type { SchedulingModule } from "./scheduling.module.ts";
import type { TeamsModule } from "./teams.module.ts";
import type { ResultsModule } from "./results.module.ts";
import { createDueProviderSyncTargetFeed } from "./due-provider-sync-target.feed.ts";
import { AssociateSyncedProviderMatches } from "@/application/game-data/associate-synced-provider-matches.ts";
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
  readonly pool: Pool | undefined;
  readonly scheduling: Pick<SchedulingModule, "encounters" | "officialMatches" | "encounterWindow">;
  readonly teams: Pick<TeamsModule, "externalClubConnections" | "externalClubTeams">;
  readonly results: Pick<ResultsModule, "associateEncounterCandidates">;
  readonly syncQuota: ProviderSyncQuotaPort;
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

  const enqueueProviderSyncJob = new EnqueueProviderSyncJobUseCase({
    transaction: deps.transaction,
    quota: deps.syncQuota,
    jobs: deps.jobs,
    ids: deps.ids,
    clock: deps.clock,
    maxAttempts: deps.maxJobAttempts,
  });

  return {
    searchExternalClubs: new SearchExternalClubsUseCase(registry),
    getExternalClub: new GetExternalClubUseCase(registry),
    getRecentProviderMatches: new GetRecentProviderMatchesUseCase(registry),
    listPlayerRecentProviderMatches: new ListPlayerRecentProviderMatchesUseCase(registry),
    getPlayerRecentProviderMatch: new GetPlayerRecentProviderMatchUseCase(registry),
    getPlayerGameProfile: new GetPlayerGameProfileUseCase(registry),
    getProviderHealth: new GetProviderHealthUseCase(deps.health),
    listMatchesBetweenClubs: new ListMatchesBetweenClubsUseCase(deps.providerMatches),
    syncRecentProviderMatches,
    enqueueProviderSyncJob,
    enqueueDueProviderSyncs: new EnqueueDueProviderSyncsUseCase({
      targets: createDueProviderSyncTargetFeed({
        pool: deps.pool,
        jobs: deps.jobs,
        encounters: deps.scheduling.encounters,
        matches: deps.scheduling.officialMatches,
        connections: deps.teams.externalClubConnections,
      }),
      jobs: deps.jobs,
      enqueue: enqueueProviderSyncJob,
      ids: deps.ids,
      clock: deps.clock,
    }),
    executeProviderSyncJob: new ExecuteProviderSyncJobUseCase({
      jobs: deps.jobs,
      completion: new AssociateSyncedProviderMatches({
        externalClubTeams: deps.teams.externalClubTeams,
        encounterWindow: deps.scheduling.encounterWindow,
        associateEncounterCandidates: deps.results.associateEncounterCandidates,
      }),
      sync: {
        execute: (providerKey, input, afterPersist) =>
          syncRecentProviderMatches.execute(providerKey, input, afterPersist),
      },
      ids: deps.ids,
      clock: deps.clock,
      leaseMs: 90_000,
      retryDelayMs: providerRetryDelayMs,
      completionRetryDelayMs: providerSyncRetryDelayMs,
      runClaimed: (job, operation) =>
        runWithPersistedJobCorrelation(createRequestCorrelation(job.requestId), job.id, operation),
    }),
    jobs: deps.jobs,
    registry,
  };
}

export type GameDataModule = ReturnType<typeof createGameDataModule>;
