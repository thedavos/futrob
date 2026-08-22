import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";

const createdAt = "2026-08-11T12:00:00.000Z";

const membership = {
  id: "membership-1",
  organizationId: "org-1",
  competitionId: "competition-1",
  teamId: "team-1",
  playerProfileId: "profile-1",
  gameAccountId: null,
  role: "player",
  createdAt,
} as const;

const team = {
  id: "team-new",
  organizationId: "org a/b",
  name: "Barranco FC",
  createdAt,
} as const;

function respondForUrl(url: string): unknown {
  if (url.endsWith("/players/me/teams")) return { teams: [], activeRosterMembershipId: null };
  if (url.endsWith("/teams")) return team;
  if (url.endsWith("/roster")) return { memberships: [] };
  if (url.includes("/team-management/")) {
    return {
      team,
      entry: {
        id: "entry-1",
        organizationId: "org-1",
        competitionId: "competition-1",
        teamId: "team-new",
        status: "pending",
        createdAt,
      },
      roster: { state: "open", memberCount: 0, maxSize: 11, lockedAt: null },
      externalClub: null,
      members: [],
    };
  }
  if (url.endsWith("/external-club")) return null;
  if (url.endsWith("/roster-invitations/accept")) return membership;
  return {
    profile: { id: "profile-1", createdAt },
    gameAccounts: [],
    externalClubs: [],
  };
}

describe("teams resource structure", () => {
  it("encodes every dynamic path segment, including legacy flat methods", async () => {
    const urls: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        const url = requestUrl(input);
        urls.push(url);
        return Response.json(respondForUrl(url));
      }),
    });

    await client.teams.createTeam("org a/b", { name: "Barranco FC" });
    await client.teams.listRoster("org a/b", "comp?1", "team x");
    await client.teams.rosters.list("org a/b", "comp?1", "team x");

    expect(urls).toEqual([
      "https://app.example.com/api/v1/organizations/org%20a%2Fb/teams",
      "https://app.example.com/api/v1/organizations/org%20a%2Fb/competitions/comp%3F1/teams/team%20x/roster",
      "https://app.example.com/api/v1/organizations/org%20a%2Fb/competitions/comp%3F1/teams/team%20x/roster",
    ]);
  });

  it("keeps flat aliases and nested resources on the same routes", async () => {
    const urls: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        const url = requestUrl(input);
        urls.push(url);
        return Response.json(respondForUrl(url));
      }),
    });

    const viaFlat = await client.teams.getMyProfile();
    const viaNested = await client.teams.players.getProfile();
    const flatClub = await client.teams.getExternalClub("org-1", "competition-1", "team-1");
    const nestedClub = await client.teams.externalClubs.retrieve(
      "org-1",
      "competition-1",
      "team-1",
    );
    await client.teams.acceptRosterInvitation({ token: "tok/en+" });
    await client.teams.rosterInvitations.accept({ token: "tok/en+" });

    expect(viaFlat).toEqual(viaNested);
    expect(flatClub).toEqual(nestedClub);
    expect(urls).toEqual([
      "https://app.example.com/api/v1/players/me",
      "https://app.example.com/api/v1/players/me",
      "https://app.example.com/api/v1/organizations/org-1/competitions/competition-1/teams/team-1/external-club",
      "https://app.example.com/api/v1/organizations/org-1/competitions/competition-1/teams/team-1/external-club",
      "https://app.example.com/api/v1/roster-invitations/accept",
      "https://app.example.com/api/v1/roster-invitations/accept",
    ]);
  });

  it("forwards per-request options through both surfaces", async () => {
    const signals: Array<AbortSignal | null | undefined> = [];
    const traces: Array<string | null> = [];
    const controller = new AbortController();
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        signals.push(init?.signal ?? null);
        traces.push(new Headers(init?.headers).get("X-Trace"));
        return Response.json(respondForUrl(requestUrl(input)));
      }),
    });

    await client.teams.getCompetitionTeamManagement("org-1", "competition-1", "team-1", {
      signal: controller.signal,
      headers: { "X-Trace": "flat" },
    });
    await client.teams.players.listTeams({
      signal: controller.signal,
      headers: { "X-Trace": "nested" },
    });

    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[1]).toBeInstanceOf(AbortSignal);
    expect(traces).toEqual(["flat", "nested"]);
  });
});
