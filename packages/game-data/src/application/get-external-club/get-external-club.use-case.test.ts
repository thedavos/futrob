import { describe, expect, it } from "vite-plus/test";
import { ok } from "@futrob/shared-kernel";
import type { ExternalClub } from "../../domain/entities/external-club.ts";
import type { GameDataProviderPort } from "../../domain/ports/game-data-provider.port.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";
import { GetExternalClubUseCase } from "./get-external-club.use-case.ts";

describe("GetExternalClubUseCase", () => {
  it("delegates to the registry provider", async () => {
    const club: ExternalClub = {
      providerKey: "ea-clubs",
      externalClubId: "10754",
      name: "Fera Enjaulada",
      platform: "common-gen5",
      gameEdition: "fc26",
    };

    const provider: GameDataProviderPort = {
      key: "ea-clubs",
      capabilities: {
        searchClubs: true,
        getClubInfo: true,
        getRecentMatches: true,
        getPlayerStats: false,
        getTeamStats: false,
      },
      searchClubs: async () => ok([]),
      getClubInfo: async () => ok(club),
      getRecentMatches: async () => ok([]),
    };

    const registry: GameDataProviderRegistryPort = {
      get: () => provider,
      findSupporting: () => [provider],
      list: () => [provider],
    };

    const useCase = new GetExternalClubUseCase(registry);
    const result = await useCase.execute("ea-clubs", {
      externalClubId: "10754",
      platform: "common-gen5",
      gameEdition: "fc26",
    });

    expect(result).toEqual(ok(club));
  });
});
