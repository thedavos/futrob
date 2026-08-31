import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";

describe("statistics SDK resource", () => {
  it("forwards personal statistics filters", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({ statistics: null });
      }),
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
      fetchImpl: mockFetch(async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({ matches: [], nextCursor: null });
      }),
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

  it("reads personal recent provider matches", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({ status: "needs_club" });
      }),
    });

    await expect(client.statistics.getMyRecentMatches()).resolves.toEqual({ status: "needs_club" });
    expect(requestedUrl).toBe("https://app.example.com/api/v1/players/me/recent-matches");
  });

  it("forwards the selected club on personal recent matches", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({ status: "needs_club" });
      }),
    });

    await client.statistics.getMyRecentMatches({ externalClubId: "10754" });
    expect(requestedUrl).toBe(
      "https://app.example.com/api/v1/players/me/recent-matches?externalClubId=10754",
    );
  });

  it("reads the personal game profile", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({ status: "needs_club" });
      }),
    });

    await expect(client.statistics.getMyGameProfile()).resolves.toEqual({ status: "needs_club" });
    expect(requestedUrl).toBe("https://app.example.com/api/v1/players/me/game-profile");
  });

  it("strips legacy ELO fields from a ready game profile", async () => {
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async () =>
        Response.json({
          status: "ready",
          profile: {
            identity: {
              displayName: "davos282",
              preferredPosition: "forward",
              preferredRole: "attack",
            },
            sampleSize: 1,
            elo: { rating: 1512, ratedMatches: 1 },
            attributes: [],
            evolution: [
              {
                occurredAt: "2026-08-01T00:00:00.000Z",
                elo: 1512,
                rating: 7.2,
                outcome: "win",
              },
            ],
            summary: emptyStatBlock(),
            byTeam: [],
            byPosition: [],
          },
        }),
      ),
    });

    const response = await client.statistics.getMyGameProfile();
    expect(response).toEqual({
      status: "ready",
      profile: {
        identity: {
          displayName: "davos282",
          preferredPosition: "forward",
          preferredRole: "attack",
        },
        sampleSize: 1,
        attributes: [],
        evolution: [
          {
            occurredAt: "2026-08-01T00:00:00.000Z",
            rating: 7.2,
            outcome: "win",
          },
        ],
        summary: emptyStatBlock(),
        byTeam: [],
        byPosition: [],
      },
    });
  });

  it("encodes the provider match identity and selected club for detail", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({ status: "not_found" });
      }),
    });

    await expect(
      client.statistics.getMyRecentMatch({
        providerKey: "ea-clubs",
        externalMatchId: "match/with spaces",
        externalClubId: "club/10754",
      }),
    ).resolves.toEqual({ status: "not_found" });
    expect(requestedUrl).toBe(
      "https://app.example.com/api/v1/players/me/recent-matches/ea-clubs/match%2Fwith%20spaces?externalClubId=club%2F10754",
    );
  });

  it("reads competition standings and team statistics", async () => {
    const requested: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        const url = requestUrl(input);
        requested.push(url);
        if (url.includes("/standings")) {
          return Response.json({ standings: null });
        }
        if (url.includes("/rankings")) {
          return Response.json({ rankings: [] });
        }
        return Response.json({ teams: [] });
      }),
    });

    await client.statistics.getCompetitionStandings({
      organizationId: "organization-1",
      competitionId: "competition-1",
    });
    await client.statistics.getCompetitionTeamStatistics({
      organizationId: "organization-1",
      competitionId: "competition-1",
    });
    await client.statistics.getCompetitionRankings({
      organizationId: "organization-1",
      competitionId: "competition-1",
      kind: "scorer",
    });

    expect(requested).toEqual([
      "https://app.example.com/api/v1/organizations/organization-1/competitions/competition-1/standings",
      "https://app.example.com/api/v1/organizations/organization-1/competitions/competition-1/team-statistics",
      "https://app.example.com/api/v1/organizations/organization-1/competitions/competition-1/rankings?kind=scorer",
    ]);
  });
});

function emptyStatBlock() {
  const zeros = {
    goals: 0,
    assists: 0,
    shots: 0,
    passAttempts: 0,
    passesMade: 0,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    mvpAwards: 0,
    rating: 0,
  };
  const partial = {
    minutes: false,
    goals: false,
    assists: false,
    shots: false,
    passAttempts: false,
    passesMade: false,
    tackleAttempts: false,
    tacklesMade: false,
    saves: false,
    yellowCards: false,
    redCards: false,
    mvpAwards: false,
    rating: false,
  };
  return {
    matchesPlayed: 1,
    wins: 1,
    draws: 0,
    losses: 0,
    minutes: 90,
    totals: zeros,
    averages: {
      ...zeros,
      rating: 7.2,
    },
    partial,
  };
}
