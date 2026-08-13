import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";

describe("statistics SDK resource", () => {
  it("forwards personal statistics filters", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({ statistics: null });
      }) as typeof fetch,
    });

    await client.statistics.getMyStatistics({
      competitionId: "competition-1",
      teamId: "team-1",
      gameEdition: "fc26",
      platform: "playstation",
      position: "midfielder",
    });

    expect(requestedUrl).toBe(
      "https://app.example.com/api/v1/players/me/statistics?competitionId=competition-1&teamId=team-1&gameEdition=fc26&platform=playstation&position=midfielder",
    );
  });

  it("forwards all personal match filters", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({ matches: [], nextCursor: null });
      }) as typeof fetch,
    });

    await client.statistics.getMyMatches({
      competitionId: "competition-1",
      teamId: "team-1",
      gameEdition: "fc26",
      platform: "playstation",
      position: "midfielder",
      limit: 10,
    });

    expect(requestedUrl).toBe(
      "https://app.example.com/api/v1/players/me/matches?competitionId=competition-1&teamId=team-1&gameEdition=fc26&platform=playstation&position=midfielder&limit=10",
    );
  });

  it("reads competition standings and team statistics", async () => {
    const requested: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (input) => {
        const url = requestUrl(input);
        requested.push(url);
        if (url.includes("/standings")) {
          return Response.json({ standings: null });
        }
        return Response.json({ teams: [] });
      }) as typeof fetch,
    });

    await client.statistics.getCompetitionStandings({
      organizationId: "organization-1",
      competitionId: "competition-1",
    });
    await client.statistics.getCompetitionTeamStatistics({
      organizationId: "organization-1",
      competitionId: "competition-1",
    });

    expect(requested).toEqual([
      "https://app.example.com/api/v1/organizations/organization-1/competitions/competition-1/standings",
      "https://app.example.com/api/v1/organizations/organization-1/competitions/competition-1/team-statistics",
    ]);
  });
});

function requestUrl(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}
