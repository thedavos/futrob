import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";

function requestUrl(input: string | URL | Request): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

describe("createFutrobClient gameData", () => {
  it("search calls /game-data/clubs/search", async () => {
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (input) => {
        const url = requestUrl(input as string | URL | Request);
        expect(url).toContain("/game-data/clubs/search?");
        expect(url).toContain("query=Fera");
        return Response.json({
          clubs: [
            {
              providerKey: "ea-clubs",
              externalClubId: "10754",
              name: "Fera Enjaulada",
              platform: "common-gen5",
              gameEdition: "fc26",
              imageUrl: null,
            },
          ],
        });
      }) as typeof fetch,
    });

    const result = await client.gameData.clubs.search({ query: "Fera" });
    expect(result.clubs[0]?.externalClubId).toBe("10754");
  });

  it("retrieve and matches call nested paths", async () => {
    const urls: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (input) => {
        const url = requestUrl(input as string | URL | Request);
        urls.push(url);
        if (url.includes("/matches")) {
          return Response.json({ matches: [] });
        }
        return Response.json({
          providerKey: "ea-clubs",
          externalClubId: "10754",
          name: "Fera Enjaulada",
          platform: "common-gen5",
          gameEdition: "fc26",
          imageUrl: null,
        });
      }) as typeof fetch,
    });

    await client.gameData.clubs.retrieve("10754");
    await client.gameData.clubs.matches("10754", { matchType: "friendlyMatch" });

    expect(urls[0]).toContain("/game-data/clubs/10754?");
    expect(urls[1]).toContain("/game-data/clubs/10754/matches?");
    expect(urls[1]).toContain("matchType=friendlyMatch");
  });

  it("validates and persists a provider sync job through the internal API", async () => {
    const client = createFutrobClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImpl: (async (input, init) => {
        expect(requestUrl(input as string | URL | Request)).toBe(
          "https://api.example.com/api/v1/internal/game-data/sync-jobs",
        );
        expect(init?.method).toBe("POST");
        return Response.json({
          id: "job-1",
          organizationId: "org-1",
          providerKey: "ea-clubs",
          status: "queued",
          attempt: 0,
          maxAttempts: 4,
          requestId: "486bb851-47f4-4e20-9266-0b413df54f74",
          availableAt: "2026-08-11T20:00:00.000Z",
          leaseExpiresAt: null,
          updatedAt: "2026-08-11T20:00:00.000Z",
        });
      }) as typeof fetch,
    });

    await expect(
      client.gameData.syncJobs.enqueue({
        organizationId: "org-1",
        providerKey: "ea-clubs",
        externalClubId: "10754",
        platform: "common-gen5",
        gameEdition: "fc26",
        matchType: "friendlyMatch",
        maxResultCount: 10,
      }),
    ).resolves.toMatchObject({ id: "job-1", status: "queued" });
  });
});
