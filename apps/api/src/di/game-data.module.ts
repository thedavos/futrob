import {
  GetExternalClubUseCase,
  GetRecentProviderMatchesUseCase,
  ListMatchesBetweenClubsUseCase,
  SearchExternalClubsUseCase,
  SyncRecentProviderMatchesUseCase,
  type ProviderMatchIngestionPort,
  type ProviderMatchRepository,
  type RawObservationRepository,
} from "@futrob/game-data";
import type { IdGeneratorPort } from "@futrob/shared-kernel";
import {
  EaClubsGameDataAdapter,
  InMemoryGameDataProviderRegistry,
  ManualGameDataAdapter,
} from "@/adapters/game-data/internal.ts";

export interface GameDataModuleDependencies {
  readonly fetcher: typeof fetch;
  readonly eaClubsBaseUrl: string;
  readonly providerMatches: ProviderMatchRepository;
  readonly rawObservations: RawObservationRepository;
  readonly ids: IdGeneratorPort;
  readonly enableManualProvider: boolean;
}

export function createGameDataModule(deps: GameDataModuleDependencies) {
  const eaProvider = new EaClubsGameDataAdapter({
    fetcher: deps.fetcher,
    baseUrl: deps.eaClubsBaseUrl,
    timeoutMs: 10_000,
  });

  const providers = deps.enableManualProvider
    ? [eaProvider, new ManualGameDataAdapter()]
    : [eaProvider];

  const registry = new InMemoryGameDataProviderRegistry(providers);
  const ingestions = new Map<string, ProviderMatchIngestionPort>([[eaProvider.key, eaProvider]]);

  return {
    searchExternalClubs: new SearchExternalClubsUseCase(registry),
    getExternalClub: new GetExternalClubUseCase(registry),
    getRecentProviderMatches: new GetRecentProviderMatchesUseCase(registry),
    listMatchesBetweenClubs: new ListMatchesBetweenClubsUseCase(deps.providerMatches),
    syncRecentProviderMatches: new SyncRecentProviderMatchesUseCase({
      ingestions: {
        get: (key) => ingestions.get(key) ?? null,
      },
      rawObservations: deps.rawObservations,
      matches: deps.providerMatches,
      ids: deps.ids,
    }),
    registry,
  };
}

export type GameDataModule = ReturnType<typeof createGameDataModule>;
