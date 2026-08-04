import { describe, expect, it } from "vite-plus/test";
import searchClubsFixture from "@/modules/game-data/adapters/providers/ea-clubs/fixtures/search-clubs.json";
import clubInfoFixture from "@/modules/game-data/adapters/providers/ea-clubs/fixtures/club-info.json";
import clubMatchesFixture from "@/modules/game-data/adapters/providers/ea-clubs/fixtures/club-matches.json";
import {
  eaClubInfoMapSchema,
  eaClubMatchesResponseSchema,
  eaSearchClubsResponseSchema,
} from "@/modules/game-data/adapters/providers/ea-clubs/schemas/ea-clubs.schemas.ts";
import {
  mapClubInfoToExternalClub,
  mapClubMatchToProviderMatch,
  mapLeaderboardEntryToExternalClub,
} from "@/modules/game-data/adapters/providers/ea-clubs/mappers/ea-clubs.mappers.ts";

describe("ea-clubs schemas and mappers", () => {
  const context = { platform: "common-gen5", gameEdition: "fc26" };

  it("parses search fixture and maps to ExternalClub", () => {
    const parsed = eaSearchClubsResponseSchema.parse(searchClubsFixture);
    const clubs = parsed
      .map((entry) => mapLeaderboardEntryToExternalClub(entry, context))
      .filter((club): club is NonNullable<typeof club> => club !== null);

    expect(clubs).toEqual([
      {
        providerKey: "ea-clubs",
        externalClubId: "10754",
        name: "Fera Enjaulada",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl:
          "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png",
      },
    ]);
  });

  it("parses club info fixture and maps to ExternalClub", () => {
    const parsed = eaClubInfoMapSchema.parse(clubInfoFixture);
    const info = parsed["10754"];
    expect(info).toBeDefined();
    expect(mapClubInfoToExternalClub(info!, context)).toEqual({
      providerKey: "ea-clubs",
      externalClubId: "10754",
      name: "Fera Enjaulada",
      platform: "common-gen5",
      gameEdition: "fc26",
      imageUrl:
        "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png",
    });
  });

  it("parses matches fixture and maps to ProviderMatch", () => {
    const parsed = eaClubMatchesResponseSchema.parse(clubMatchesFixture);
    const match = mapClubMatchToProviderMatch(parsed[0]!, {
      ...context,
      matchType: "friendlyMatch",
      focalExternalClubId: "10754",
    });

    expect(match).toMatchObject({
      id: "ea-clubs:336118610940060",
      provider: { key: "ea-clubs", externalMatchId: "336118610940060" },
      home: { externalClubId: "10754", name: "Fera Enjaulada", goals: 2 },
      away: { externalClubId: "2575670", name: "Brothers tm", goals: 3 },
      metadata: { winnerByForfeit: false, completeness: "complete" },
    });
    expect(match?.occurredAt.toISOString()).toBe(new Date(1768624748 * 1000).toISOString());
    expect(match?.players.length).toBeGreaterThan(0);
  });
});
