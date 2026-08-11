import {
  GetExternalClubUseCase,
  GetRecentProviderMatchesUseCase,
  ListMatchesBetweenClubsUseCase,
  SearchExternalClubsUseCase,
  SyncRecentProviderMatchesUseCase,
  type GameDataProviderPort,
  type ProviderMatchIngestionPort,
  type ProviderMatchRepository,
  type RawObservationRepository,
} from "@futrob/game-data";
import type { IdGeneratorPort } from "@futrob/shared-kernel";
import { InMemoryGameDataProviderRegistry } from "@/adapters/game-data/internal.ts";

export interface GameDataModuleDependencies {
  readonly providers: readonly GameDataProviderPort[];
  readonly ingestion: ProviderMatchIngestionPort;
  readonly providerMatches: ProviderMatchRepository;
  readonly rawObservations: RawObservationRepository;
  readonly ids: IdGeneratorPort;
}

export function createGameDataModule(deps: GameDataModuleDependencies) {
  const registry = new InMemoryGameDataProviderRegistry(deps.providers);

  return {
    searchExternalClubs: new SearchExternalClubsUseCase(registry),
    getExternalClub: new GetExternalClubUseCase(registry),
    getRecentProviderMatches: new GetRecentProviderMatchesUseCase(registry),
    listMatchesBetweenClubs: new ListMatchesBetweenClubsUseCase(deps.providerMatches),
    syncRecentProviderMatches: new SyncRecentProviderMatchesUseCase({
      ingestions: {
        get: (key) => (deps.ingestion.key === key ? deps.ingestion : null),
      },
      rawObservations: deps.rawObservations,
      matches: deps.providerMatches,
      ids: deps.ids,
    }),
    registry,
  };
}

export type GameDataModule = ReturnType<typeof createGameDataModule>;
