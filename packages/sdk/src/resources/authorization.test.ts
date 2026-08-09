import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";

describe("authorization SDK resource", () => {
  it("queries effective access with the full contextual scope", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({
          actorId: "actor-1",
          scope: {
            organizationId: "org-1",
            competitionId: "competition-1",
            teamId: "team-1",
          },
          roles: [{ scopeType: "team", scopeId: "team-1", role: "captain" }],
          permissions: [{ permission: "teams.roster.manage", allowed: true, decidedAt: "team" }],
        });
      }) as typeof fetch,
    });

    const access = await client.authorization.getEffectiveAccess(
      { organizationId: "org-1", competitionId: "competition-1", teamId: "team-1" },
      ["teams.roster.manage"],
    );

    expect(access.permissions[0]?.allowed).toBe(true);
    expect(requestedUrl).toContain("organizationId=org-1");
    expect(requestedUrl).toContain("competitionId=competition-1");
    expect(requestedUrl).toContain("teamId=team-1");
    expect(requestedUrl).toContain("permissions=teams.roster.manage");
  });

  it("changes a competition role through its scoped endpoint", async () => {
    const requests: Array<{ url: string; method: string | undefined; body: unknown }> = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (input, init) => {
        const url = requestUrl(input);
        requests.push({
          url,
          method: init?.method,
          body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
        });
        return Response.json({
          organizationId: "org-1",
          competitionId: "competition-1",
          actorId: "member-1",
          role: "captain",
          createdAt: "2026-08-07T12:00:00.000Z",
        });
      }) as typeof fetch,
    });

    const result = await client.authorization.changeCompetitionRole(
      "org-1",
      "competition-1",
      "member-1",
      { role: "captain" },
    );

    expect(result.role).toBe("captain");
    expect(requests).toEqual([
      {
        url: "https://app.example.com/api/v1/organizations/org-1/competitions/competition-1/members/member-1/role",
        method: "PATCH",
        body: { role: "captain" },
      },
    ]);
  });
});

function requestUrl(input: string | URL | Request): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}
