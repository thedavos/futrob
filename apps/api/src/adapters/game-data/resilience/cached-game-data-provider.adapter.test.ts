import { describe, expect, it } from "vite-plus/test";
import { err, ok, type Result } from "@futrob/shared-kernel";
import { ProviderRefreshInProgress, ProviderTimeout } from "@futrob/game-data";
import type {
  ExternalClub,
  GameDataProviderPort,
  ProviderError,
  ProviderMatchIngestionPort,
} from "@futrob/game-data";
import { CachedGameDataProviderAdapter } from "./cached-game-data-provider.adapter.ts";
import { InMemoryProviderResponseCache } from "./provider-response-cache.ts";

const club: ExternalClub = {
  providerKey: "ea-clubs",
  externalClubId: "10754",
  name: "Fera Enjaulada",
  platform: "common-gen5",
  gameEdition: "fc26",
  imageUrl: null,
};

describe("CachedGameDataProviderAdapter", () => {
  it("single-flights concurrent misses and fails fast when the follower has no stale value", async () => {
    let calls = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const provider = {
      key: "ea-clubs",
      capabilities: {
        searchClubs: true,
        getClubInfo: true,
        getRecentMatches: true,
        getPlayerStats: true,
        getTeamStats: true,
      },
      async searchClubs(): Promise<Result<ExternalClub[], ProviderError>> {
        calls += 1;
        await gate;
        return ok([club]);
      },
      getClubInfo: async () => ok(club),
      getRecentMatches: async () => ok([]),
      ingestRecentMatches: async () => ok({ observations: [], matches: [] }),
    } satisfies GameDataProviderPort & ProviderMatchIngestionPort;
    const adapter = new CachedGameDataProviderAdapter(provider, {
      cache: new InMemoryProviderResponseCache(),
      clock: { now: () => new Date("2026-08-11T20:00:00.000Z") },
      ids: { generate: () => "refresh-lease" },
      sleep: async () => Promise.resolve(),
      searchTtlMs: 30_000,
      clubTtlMs: 300_000,
      staleMs: 300_000,
    });
    const query = { query: "fera", platform: "common-gen5", gameEdition: "fc26" };

    const first = adapter.searchClubs({
      query: " FERA ",
      platform: "COMMON-GEN5",
      gameEdition: "FC26",
    });
    const concurrent = await adapter.searchClubs(query);
    expect(concurrent.isOk()).toBe(false);
    if (!concurrent.isOk()) {
      expect(ProviderRefreshInProgress.is(concurrent.error)).toBe(true);
    }

    release?.();
    expect((await first).isOk()).toBe(true);
    expect(calls).toBe(1);
    expect((await adapter.searchClubs(query)).isOk()).toBe(true);
    expect(calls).toBe(1);
  });

  it("serves fresh hits and bounded stale data only for transient failures", async () => {
    let now = new Date("2026-08-11T20:00:00.000Z");
    let calls = 0;
    let failing = false;
    const provider = {
      key: "ea-clubs",
      capabilities: {
        searchClubs: true,
        getClubInfo: true,
        getRecentMatches: true,
        getPlayerStats: true,
        getTeamStats: true,
      },
      searchClubs: async () => ok([]),
      async getClubInfo(): Promise<Result<ExternalClub, ProviderError>> {
        calls += 1;
        return failing
          ? err(
              new ProviderTimeout({
                code: "game_data.ea_clubs_timeout",
                message: "timeout",
                path: "/clubs/info",
                cause: "aborted",
              }),
            )
          : ok(club);
      },
      getRecentMatches: async () => ok([]),
      ingestRecentMatches: async () => ok({ observations: [], matches: [] }),
    } satisfies GameDataProviderPort & ProviderMatchIngestionPort;
    const adapter = new CachedGameDataProviderAdapter(provider, {
      cache: new InMemoryProviderResponseCache(),
      clock: { now: () => now },
      ids: { generate: () => `lease-${calls}` },
      sleep: async () => Promise.resolve(),
      searchTtlMs: 1_000,
      clubTtlMs: 1_000,
      staleMs: 2_000,
    });
    const input = {
      externalClubId: "10754",
      platform: "common-gen5",
      gameEdition: "fc26",
    };

    expect((await adapter.getClubInfo(input)).isOk()).toBe(true);
    expect((await adapter.getClubInfo(input)).isOk()).toBe(true);
    expect(calls).toBe(1);

    failing = true;
    now = new Date("2026-08-11T20:00:01.500Z");
    expect((await adapter.getClubInfo(input)).isOk()).toBe(true);
    now = new Date("2026-08-11T20:00:03.500Z");
    expect((await adapter.getClubInfo(input)).isOk()).toBe(false);
  });
});
