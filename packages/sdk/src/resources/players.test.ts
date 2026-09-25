import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";

describe("players SDK resource", () => {
  it("reads the personal profile through the typed client", async () => {
    const requests: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        requests.push(requestUrl(input));
        return Response.json({ profile: null, gameAccounts: [], externalClubs: [] });
      }),
    });
    await expect(client.players.getProfile()).resolves.toEqual({
      profile: null,
      gameAccounts: [],
      externalClubs: [],
    });
    expect(requests).toEqual(["https://app.example.com/api/v1/players/me"]);
  });

  it("patches a personal game account through the typed client", async () => {
    const requests: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        requests.push(`${init?.method ?? "GET"} ${requestUrl(input)}`);
        return Response.json({
          profile: { id: "profile-1", createdAt: "2026-08-01T00:00:00.000Z" },
          gameAccount: {
            id: "account-1",
            playerProfileId: "profile-1",
            identifier: "davos283",
            providerExternalPlayerId: null,
            platform: "xbox",
            gameEdition: "FC 25",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        });
      }),
    });
    await expect(
      client.players.updateGameAccount("account-1", {
        identifier: "davos283",
        platform: "xbox",
        gameEdition: "FC 25",
      }),
    ).resolves.toMatchObject({
      gameAccount: { id: "account-1", identifier: "davos283", platform: "xbox" },
    });
    expect(requests).toEqual([
      "PATCH https://app.example.com/api/v1/players/me/game-accounts/account-1",
    ]);
  });
});
