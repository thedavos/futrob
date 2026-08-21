import { describe, expect, it } from "vite-plus/test";
import searchClubsFixture from "./fixtures/search-clubs.json";
import clubInfoFixture from "./fixtures/club-info.json";
import clubMatchesFixture from "./fixtures/club-matches.json";
import {
  eaClubInfoMapSchema,
  eaClubMatchesResponseSchema,
  eaSearchClubsResponseSchema,
} from "./schemas.ts";
import {
  mapClubInfoToExternalClub,
  mapClubMatchToProviderMatch,
  mapLeaderboardEntryToExternalClub,
} from "./mappers.ts";

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

  it("parses an empty object as no matches", () => {
    expect(eaClubMatchesResponseSchema.parse({})).toEqual([]);
    expect(eaClubMatchesResponseSchema.parse(null)).toEqual([]);
  });

  it("keeps valid matches when a sibling row cannot be parsed", () => {
    const parsed = eaClubMatchesResponseSchema.parse([
      clubMatchesFixture[0],
      { matchId: "broken" },
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.matchId).toBe("336118610940060");
  });

  it("maps full player stats and preserves zero versus absent fields", () => {
    const parsed = eaClubMatchesResponseSchema.parse(clubMatchesFixture);
    const match = mapClubMatchToProviderMatch(parsed[0]!, {
      ...context,
      matchType: "friendlyMatch",
      focalExternalClubId: "10754",
    });

    const complete = match?.players.find((player) => player.externalPlayerId === "922546779");
    expect(complete).toEqual({
      externalPlayerId: "922546779",
      displayName: "Vcaliari",
      externalClubId: "10754",
      position: "midfielder",
      minutesPlayed: null,
      goals: 0,
      assists: 0,
      shots: 1,
      passAttempts: 19,
      passesMade: 14,
      tackleAttempts: 9,
      tacklesMade: 4,
      saves: null,
      yellowCards: null,
      redCards: 0,
      isMvp: false,
      rating: 7.6,
    });

    const partial = match?.players.find((player) => player.externalPlayerId === "111");
    expect(partial).toEqual({
      externalPlayerId: "111",
      displayName: "Rival Cap",
      externalClubId: "2575670",
      position: null,
      minutesPlayed: null,
      goals: 2,
      assists: 1,
      shots: null,
      passAttempts: null,
      passesMade: null,
      tackleAttempts: null,
      tacklesMade: null,
      saves: null,
      yellowCards: null,
      redCards: null,
      isMvp: null,
      rating: 8.1,
    });
  });
});
