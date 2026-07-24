import { InMemoryProviderMatchRepository } from "@/adapters/persistence/in-memory-provider-match.repository.ts";
import { createGameDataModule, type GameDataModule } from "./game-data.module.ts";

/**
 * Composition root for apps/api — the only place that wires adapters to use
 * cases. Persistence stays in-memory until Postgres tables are modelled.
 */
export interface CreateModulesInput {
  readonly fetcher: typeof fetch;
  readonly eaClubsBaseUrl: string;
}

export function createModules(input: CreateModulesInput): AppModules {
  const gameData = createGameDataModule({
    fetcher: input.fetcher,
    eaClubsBaseUrl: input.eaClubsBaseUrl,
    providerMatches: new InMemoryProviderMatchRepository(),
    enableManualProvider: true,
  });

  return { gameData };
}

export interface AppModules {
  readonly gameData: GameDataModule;
}
