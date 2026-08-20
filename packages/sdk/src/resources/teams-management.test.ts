import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";

const summary = {
  team: {
    id: "team-1",
    organizationId: "org-1",
    name: "Barranco FC",
    createdAt: "2026-08-11T12:00:00.000Z",
  },
  entry: {
    id: "entry-1",
    organizationId: "org-1",
    competitionId: "competition-1",
    teamId: "team-1",
    status: "pending",
    createdAt: "2026-08-11T12:00:00.000Z",
  },
  roster: { state: "open", memberCount: 0, maxSize: 11, lockedAt: null },
  externalClub: null,
} as const;

describe("team management SDK resources", () => {
  it("lists and gets competition-scoped management reads", async () => {
    const requests: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        const url = requestUrl(input);
        requests.push(url);
        return Response.json(
          url.endsWith("/team-1")
            ? { ...summary, members: [] }
            : { items: [summary], nextCursor: null },
        );
      }),
    });

    const list = await client.teams.listCompetitionManagement("org-1", "competition-1", {
      limit: 25,
    });
    const detail = await client.teams.getCompetitionTeamManagement(
      "org-1",
      "competition-1",
      "team-1",
    );

    expect(list.items[0]?.entry.status).toBe("pending");
    expect(detail.team.id).toBe("team-1");
    expect(requests).toEqual([
      "https://app.example.com/api/v1/organizations/org-1/competitions/competition-1/team-management?limit=25",
      "https://app.example.com/api/v1/organizations/org-1/competitions/competition-1/team-management/team-1",
    ]);
  });

  it("approves and rejects competition entries", async () => {
    const requests: Array<{ url: string; method: string | undefined }> = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        const url = requestUrl(input);
        requests.push({ url, method: init?.method });
        return Response.json({
          ...summary.entry,
          status: url.endsWith("/approve") ? "approved" : "rejected",
        });
      }),
    });

    await client.competitions.approveTeamEntry("org-1", "competition-1", "entry-1");
    await client.competitions.rejectTeamEntry("org-1", "competition-1", "entry-1");

    expect(requests).toEqual([
      {
        url: "https://app.example.com/api/v1/organizations/org-1/competitions/competition-1/entries/entry-1/approve",
        method: "POST",
      },
      {
        url: "https://app.example.com/api/v1/organizations/org-1/competitions/competition-1/entries/entry-1/reject",
        method: "POST",
      },
    ]);
  });
});
