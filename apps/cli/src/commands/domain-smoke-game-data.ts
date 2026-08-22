import { Effect } from "effect";
import {
  externalReferenceKey,
  isGameDataProviderKey,
  providerSyncDedupeKey,
  SearchExternalClubsUseCase,
  type ExternalClub,
  type GameDataProviderPort,
  type GameDataProviderRegistryPort,
} from "@futrob/game-data";
import { ok } from "@futrob/shared-kernel";
import { print, printJson } from "../lib/print.ts";

function fakeClub(externalClubId: string, name: string): ExternalClub {
  return {
    providerKey: "ea-clubs",
    externalClubId,
    name,
    platform: "common-gen5",
    gameEdition: "fc26",
    imageUrl: null,
  };
}

const fakeProvider: GameDataProviderPort = {
  key: "ea-clubs",
  capabilities: {
    searchClubs: true,
    getClubInfo: true,
    getRecentMatches: true,
    getPlayerStats: false,
    getTeamStats: false,
  },
  searchClubs: (input) =>
    Promise.resolve(
      ok(
        [
          fakeClub("1001", `${input.query} FC`),
          fakeClub("1002", `Deportivo ${input.query}`),
        ].filter((club) => club.name.toLowerCase().includes(input.query.toLowerCase())),
      ),
    ),
  getClubInfo: () => Promise.resolve(ok(fakeClub("1001", "Fake FC"))),
  getRecentMatches: () => Promise.resolve(ok([])),
};

const fakeRegistry: GameDataProviderRegistryPort = {
  get: () => fakeProvider,
  findSupporting: () => [fakeProvider],
  list: () => [fakeProvider],
};

async function smoke(): Promise<number> {
  if (!isGameDataProviderKey("ea-clubs") || isGameDataProviderKey("nope")) {
    return 1;
  }

  const ref = { providerKey: "ea-clubs" as const, externalId: "1001" };
  if (externalReferenceKey(ref) !== "ea-clubs:1001") {
    return 1;
  }

  const dedupe = providerSyncDedupeKey({
    providerKey: "ea-clubs",
    sync: {
      externalClubId: " 1001 ",
      platform: "Common-Gen5",
      gameEdition: "FC26",
      matchType: "club_match",
      maxResultCount: 10,
    },
  });
  if (dedupe !== "recent-matches:ea-clubs:1001:common-gen5:fc26:club_match:10") {
    return 1;
  }

  const search = new SearchExternalClubsUseCase(fakeRegistry);
  const result = await search.execute("ea-clubs", {
    query: "fera",
    platform: "common-gen5",
    gameEdition: "fc26",
  });
  if (!result.isOk()) {
    return 1;
  }
  const clubs = result.value;

  print("domain-smoke-game-data ok");
  printJson({ dedupe, found: clubs.map((club) => club.name) });
  return 0;
}

export function run(): Effect.Effect<number> {
  return Effect.promise(smoke);
}
