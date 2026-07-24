import { describe, expect, it } from "vite-plus/test";
import { ok } from "@/shared/domain/result.ts";
import { InMemoryGameDataProviderRegistry } from "@/modules/game-data/adapters/registry/in-memory-provider-registry.adapter.ts";
import type {
  GameDataProviderCapabilities,
  GameDataProviderPort,
  GameDataProviderKey,
} from "@futrob/game-data";

function fakeProvider(
  key: GameDataProviderKey,
  capabilities: Partial<GameDataProviderCapabilities> = {},
): GameDataProviderPort {
  return {
    key,
    capabilities: {
      searchClubs: false,
      getClubInfo: false,
      getRecentMatches: false,
      getPlayerStats: false,
      getTeamStats: false,
      ...capabilities,
    },
    searchClubs: async () => ok([]),
    getClubInfo: async () => {
      throw new Error("not implemented");
    },
    getRecentMatches: async () => ok([]),
  };
}

describe("InMemoryGameDataProviderRegistry", () => {
  it("gets a registered provider", () => {
    const ea = fakeProvider("ea-clubs", { searchClubs: true });
    const registry = new InMemoryGameDataProviderRegistry([ea]);

    expect(registry.get("ea-clubs")).toBe(ea);
  });

  it("throws when the provider is missing", () => {
    const registry = new InMemoryGameDataProviderRegistry([]);
    expect(() => registry.get("manual")).toThrow("Provider not registered: manual");
  });

  it("lists providers and filters by capability", () => {
    const ea = fakeProvider("ea-clubs", { searchClubs: true, getRecentMatches: true });
    const manual = fakeProvider("manual", { searchClubs: true });
    const registry = new InMemoryGameDataProviderRegistry([ea, manual]);

    expect(registry.list()).toEqual([ea, manual]);
    expect(registry.findSupporting("getRecentMatches")).toEqual([ea]);
    expect(registry.findSupporting("getPlayerStats")).toEqual([]);
  });
});
