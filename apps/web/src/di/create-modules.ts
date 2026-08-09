import type { RuntimeConfig } from "@/config/runtime-config.ts";
import { createGameDataModule } from "@/di/game-data.module.ts";
import { createResultsModule } from "@/di/results.module.ts";
import type { EventPublisherPort } from "@/shared/application/event-publisher.ts";
import type { EncounterReaderPort } from "@/modules/results";
import type { ProviderMatchRepository } from "@/modules/game-data";
import type { AuthorizationPort } from "@futrob/shared-kernel";

/**
 * Composition root entry — only place that wires adapters to use cases.
 * Persistence adapters are injected as stubs until D1 implementations land.
 */
export function createModules(input: {
  readonly config: RuntimeConfig;
  readonly fetcher: typeof fetch;
  readonly eventPublisher: EventPublisherPort;
  readonly encounterReader: EncounterReaderPort;
  readonly providerMatches: ProviderMatchRepository;
  readonly authorization: AuthorizationPort;
}) {
  const gameData = createGameDataModule({
    fetcher: input.fetcher,
    eaClubsBaseUrl: input.config.env.EA_CLUBS_BASE_URL,
    providerMatches: input.providerMatches,
    enableManualProvider: input.config.flags.manualGameDataProvider,
  });

  const results = createResultsModule({
    encounterReader: input.encounterReader,
    eventPublisher: input.eventPublisher,
    authorization: input.authorization,
  });

  return {
    gameData,
    results,
  };
}

export type AppModules = ReturnType<typeof createModules>;
