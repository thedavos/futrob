import {
  GetExternalClubUseCase,
  GetRecentProviderMatchesUseCase,
  ListMatchesBetweenClubsUseCase,
  SearchExternalClubsUseCase,
} from "@futrob/game-data";
import type { ProviderMatchRepository } from "@futrob/game-data";
import {
  EaClubsGameDataAdapter,
  InMemoryGameDataProviderRegistry,
  ManualGameDataAdapter,
} from "@/adapters/game-data/internal.ts";

export interface GameDataModuleDependencies {
  readonly fetcher: typeof fetch;
  readonly eaClubsBaseUrl: string;
  readonly providerMatches: ProviderMatchRepository;
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

  return {
    searchExternalClubs: new SearchExternalClubsUseCase(registry),
    getExternalClub: new GetExternalClubUseCase(registry),
    getRecentProviderMatches: new GetRecentProviderMatchesUseCase(registry),
    listMatchesBetweenClubs: new ListMatchesBetweenClubsUseCase(deps.providerMatches),
    registry,
  };
}

export type GameDataModule = ReturnType<typeof createGameDataModule>;
