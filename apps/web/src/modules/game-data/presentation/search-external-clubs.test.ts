import { afterEach, describe, expect, it } from "vite-plus/test";
import { EA_SEARCH_PLATFORM } from "@futrob/api-contracts";
import { configureExternalClubSearch, searchExternalClubs } from "./search-external-clubs.ts";

afterEach(() => {
  configureExternalClubSearch(null);
});

describe("searchExternalClubs", () => {
  it("uses the Storybook override instead of the live client", async () => {
    configureExternalClubSearch(async () => [
      {
        providerKey: "ea-clubs",
        externalClubId: "22110",
        name: "Fera Enjaulada",
        platform: EA_SEARCH_PLATFORM.CROSS_GEN,
        gameEdition: "fc26",
        imageUrl: null,
      },
    ]);

    const clubs = await searchExternalClubs({
      query: "Fera",
      platform: EA_SEARCH_PLATFORM.CROSS_GEN,
      gameEdition: "fc26",
    });

    expect(clubs).toEqual([
      {
        providerKey: "ea-clubs",
        externalClubId: "22110",
        name: "Fera Enjaulada",
        platform: EA_SEARCH_PLATFORM.CROSS_GEN,
        gameEdition: "fc26",
        imageUrl: null,
      },
    ]);
  });
});
