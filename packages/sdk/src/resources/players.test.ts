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
});
