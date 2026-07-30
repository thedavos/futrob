import { InMemoryProviderMatchRepository } from "@/adapters/persistence/in-memory-provider-match.repository.ts";
import type { Pool } from "pg";
import { createGameDataModule, type GameDataModule } from "./game-data.module.ts";
import { createIdentityModule, type IdentityModule } from "./identity.module.ts";
import { createOrganizationsModule, type OrganizationsModule } from "./organizations.module.ts";

/**
 * Composition root for apps/api — the only place that wires adapters to use
 * cases. Organizations use Postgres when a pool is provided; otherwise memory.
 */
export interface CreateModulesInput {
  readonly fetcher: typeof fetch;
  readonly eaClubsBaseUrl: string;
  readonly pool: Pool | undefined;
}

export function createModules(input: CreateModulesInput): AppModules {
  const gameData = createGameDataModule({
    fetcher: input.fetcher,
    eaClubsBaseUrl: input.eaClubsBaseUrl,
    providerMatches: new InMemoryProviderMatchRepository(),
    enableManualProvider: true,
  });

  const organizations = createOrganizationsModule({
    pool: input.pool,
  });
  const identity = createIdentityModule({
    pool: input.pool,
  });

  return { gameData, identity, organizations };
}

export interface AppModules {
  readonly gameData: GameDataModule;
  readonly identity: IdentityModule;
  readonly organizations: OrganizationsModule;
}
