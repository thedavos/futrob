import { describe, expect, it } from "vite-plus/test";
import { createModules } from "./create-modules.ts";

const EA_BASE_URL = "https://ea.example.test/api/fc";

const recentMatches = {
  externalClubId: "100",
  platform: "common-gen5",
  gameEdition: "fc26",
  matchType: "friendlyMatch",
  maxResultCount: 10,
};

describe("game-data provider composition", () => {
  it("keeps EA ingestion and selects manual review only by its provider key", async () => {
    const calls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      calls.push(String(input));
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const { gameData } = createModules({
      fetcher,
      eaClubsBaseUrl: EA_BASE_URL,
      pool: undefined,
    });

    expect(gameData.registry.list().map((provider) => provider.key)).toEqual([
      "ea-clubs",
      "manual",
    ]);
    expect(gameData.registry.findSupporting("searchClubs").map((provider) => provider.key)).toEqual(
      ["ea-clubs"],
    );
    expect(
      gameData.registry.findSupporting("getRecentMatches").map((provider) => provider.key),
    ).toEqual(["ea-clubs", "manual"]);
    expect(() => gameData.registry.get("screenshot-ocr")).toThrow(
      "Provider not registered: screenshot-ocr",
    );

    const manualSearch = await gameData.searchExternalClubs.execute("manual", {
      query: "futrob",
      platform: "common-gen5",
      gameEdition: "fc26",
    });
    expect(manualSearch.isErr() && manualSearch.error.code).toBe("game_data.unsupported_operation");
    expect(calls).toEqual([]);

    const manualMatches = await gameData.getRecentProviderMatches.execute("manual", recentMatches);
    expect(manualMatches.isErr() && manualMatches.error.code).toBe(
      "game_data.provider_not_implemented",
    );
    expect(manualMatches.isErr() && manualMatches.error.message).toContain("ManualGameDataAdapter");

    const manualSync = await gameData.syncRecentProviderMatches.execute("manual", recentMatches);
    expect(manualSync.isErr() && manualSync.error.code).toBe("game_data.provider_not_implemented");
    expect(manualSync.isErr() && manualSync.error.message).toBe(
      "No ingestion adapter for provider manual",
    );
    expect(calls).toEqual([]);

    const eaSearch = await gameData.searchExternalClubs.execute("ea-clubs", {
      query: "futrob",
      platform: "common-gen5",
      gameEdition: "fc26",
    });
    expect(eaSearch.isOk() && eaSearch.value).toEqual([]);
    expect(calls).toEqual([expect.stringContaining(`${EA_BASE_URL}/allTimeLeaderboard/search`)]);

    const eaSync = await gameData.syncRecentProviderMatches.execute("ea-clubs", recentMatches);
    expect(eaSync.isOk() && eaSync.value).toEqual([]);
    expect(calls).toEqual([
      expect.stringContaining(`${EA_BASE_URL}/allTimeLeaderboard/search`),
      expect.stringContaining(`${EA_BASE_URL}/clubs/matches`),
    ]);
  });
});
