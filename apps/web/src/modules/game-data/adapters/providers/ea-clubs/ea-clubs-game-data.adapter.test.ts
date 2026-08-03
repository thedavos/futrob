import { describe, expect, it } from "vite-plus/test";
import { ProviderHttpFailed } from "@futrob/game-data";
import { EaClubsGameDataAdapter } from "@/modules/game-data/adapters/providers/ea-clubs/ea-clubs-game-data.adapter.ts";
import searchClubsFixture from "@/modules/game-data/adapters/providers/ea-clubs/fixtures/search-clubs.json";
import clubInfoFixture from "@/modules/game-data/adapters/providers/ea-clubs/fixtures/club-info.json";
import clubMatchesFixture from "@/modules/game-data/adapters/providers/ea-clubs/fixtures/club-matches.json";

function createFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return handler(url, init);
  }) as typeof fetch;
}

describe("EaClubsGameDataAdapter", () => {
  const baseUrl = "https://proclubs.ea.com/api/fc";

  it("searchClubs calls EA search and maps clubs", async () => {
    const adapter = new EaClubsGameDataAdapter({
      baseUrl,
      timeoutMs: 5_000,
      fetcher: createFetch((url, init) => {
        expect(url).toContain("/allTimeLeaderboard/search");
        expect(url).toContain("clubName=Fera");
        const headers = new Headers(init?.headers);
        expect(headers.get("User-Agent")).toMatch(/Firefox/);
        expect(headers.get("Sec-Fetch-Mode")).toBe("navigate");
        return Response.json(searchClubsFixture);
      }),
    });

    const result = await adapter.searchClubs({
      query: "Fera",
      platform: "common-gen5",
      gameEdition: "fc26",
    });

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value[0]?.externalClubId).toBe("10754");
  });

  it("getClubInfo maps club by id", async () => {
    const adapter = new EaClubsGameDataAdapter({
      baseUrl,
      timeoutMs: 5_000,
      fetcher: createFetch((url) => {
        expect(url).toContain("/clubs/info");
        expect(url).toContain("clubIds=10754");
        return Response.json(clubInfoFixture);
      }),
    });

    const result = await adapter.getClubInfo({
      externalClubId: "10754",
      platform: "common-gen5",
      gameEdition: "fc26",
    });

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value.name).toBe("Fera Enjaulada");
  });

  it("getRecentMatches maps provider matches", async () => {
    const adapter = new EaClubsGameDataAdapter({
      baseUrl,
      timeoutMs: 5_000,
      fetcher: createFetch((url) => {
        expect(url).toContain("/clubs/matches");
        expect(url).toContain("matchType=friendlyMatch");
        return Response.json(clubMatchesFixture);
      }),
    });

    const result = await adapter.getRecentMatches({
      externalClubId: "10754",
      platform: "common-gen5",
      gameEdition: "fc26",
      matchType: "friendlyMatch",
      maxResultCount: 50,
    });

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toHaveLength(1);
    expect(result.isOk() && result.value[0]?.provider.externalMatchId).toBe("336118610940060");
  });

  it("returns provider error on non-OK HTTP", async () => {
    const adapter = new EaClubsGameDataAdapter({
      baseUrl,
      timeoutMs: 5_000,
      fetcher: createFetch(() => new Response("nope", { status: 503 })),
    });

    const result = await adapter.searchClubs({
      query: "x",
      platform: "common-gen5",
      gameEdition: "fc26",
    });

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && ProviderHttpFailed.is(result.error)).toBe(true);
    expect(!result.isOk() && result.error.code).toBe("game_data.ea_clubs_http_error");
  });
});
