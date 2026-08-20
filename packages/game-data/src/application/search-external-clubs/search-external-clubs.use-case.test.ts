import { describe, expect, it } from "vite-plus/test";
import { ok } from "@futrob/shared-kernel";
import { SearchExternalClubsUseCase } from "./search-external-clubs.use-case.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";
import type { GameDataProviderPort } from "../../domain/ports/game-data-provider.port.ts";
import type { ExternalClub } from "../../domain/entities/external-club.ts";

describe("SearchExternalClubsUseCase", () => {
  it("searches through the selected provider", async () => {
    const clubs = [
      {
        providerKey: "ea-clubs",
        externalClubId: "c-1",
        name: "Club",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl: null,
      },
    ] satisfies ExternalClub[];
    const provider = {
      key: "ea-clubs",
      capabilities: {
        searchClubs: true,
        getClubInfo: false,
        getRecentMatches: false,
        getPlayerStats: false,
        getTeamStats: false,
      },
      searchClubs: async () => ok(clubs),
      getClubInfo: async () => {
        throw new Error("not implemented");
      },
      getRecentMatches: async () => ok([]),
    } satisfies GameDataProviderPort;

    const registry: GameDataProviderRegistryPort = {
      get: (key) => {
        expect(key).toBe("ea-clubs");
        return provider;
      },
      findSupporting: () => [provider],
      list: () => [provider],
    };

    const useCase = new SearchExternalClubsUseCase(registry);
    const result = await useCase.execute("ea-clubs", {
      query: "Davion",
      platform: "common-gen5",
      gameEdition: "fc26",
    });

    expect(result).toEqual(ok(clubs));
  });
});
