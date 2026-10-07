import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";

const activity = {
  id: "row-1",
  organizationId: "org/a",
  competitionId: "cmp-1",
  audience: "organization",
  kind: "match_dispute",
  status: "open",
  requiresAction: true,
  resourceType: "encounter",
  resourceId: "enc-1",
  subject: { competitionName: "Liga", encounterLabel: "A vs B", teamName: null },
  openedAt: "2026-10-07T10:00:00.000Z",
  closedAt: null,
  expiresAt: null,
  lastEventAt: "2026-10-07T10:00:00.000Z",
};

describe("activities SDK resource", () => {
  it("reads the organization feed with pending filters and a cursor", async () => {
    const urls: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        urls.push(requestUrl(input));
        expect(init?.method).toBe("GET");
        return Response.json({ activities: [activity], nextCursor: "1.row-1" });
      }),
    });

    const page = await client.activities.listForOrganization("org/a", {
      status: "open",
      requiresAction: true,
      limit: 10,
      cursor: "2.row-2",
    });
    await client.activities.listForOrganization("org/a");

    expect(page).toEqual({ activities: [activity], nextCursor: "1.row-1" });
    expect(urls).toEqual([
      "https://app.example.com/api/v1/organizations/org%2Fa/activities?status=open&requiresAction=true&limit=10&cursor=2.row-2",
      "https://app.example.com/api/v1/organizations/org%2Fa/activities",
    ]);
  });

  it("reads the personal feed and rejects malformed rows", async () => {
    let url = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        url = requestUrl(input);
        return Response.json({ activities: [{ ...activity, kind: "unknown" }], nextCursor: null });
      }),
    });
    await expect(client.activities.listMine({ requiresAction: false })).rejects.toThrow();
    expect(url).toBe("https://app.example.com/api/v1/players/me/activities?requiresAction=false");
  });
});
