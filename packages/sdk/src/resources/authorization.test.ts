import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, parseMockJsonBody, requestUrl } from "../testing/mock-fetch.ts";

describe("authorization SDK resource", () => {
  it("queries effective access with the full contextual scope", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
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
      }),
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
      fetchImpl: mockFetch(async (input, init) => {
        const url = requestUrl(input);
        requests.push({
          url,
          method: init?.method,
          body: parseMockJsonBody(init),
        });
        return Response.json({
          organizationId: "org-1",
          competitionId: "competition-1",
          actorId: "member-1",
          role: "captain",
          createdAt: "2026-08-07T12:00:00.000Z",
        });
      }),
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

  it("keeps invitation management off the authorization resource", async () => {
    const paths: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        const path = new URL(requestUrl(input)).pathname;
        paths.push(path);
        if (path.includes("roster-invitations")) {
          return Response.json({
            invitationId: "roster-invite-1",
            organizationId: "org-1",
            competitionId: "competition-1",
            teamId: "team-1",
            role: "player",
            status: "pending",
            expiresAt: "2026-08-08T12:00:00.000Z",
            createdAt: "2026-08-07T12:00:00.000Z",
            token: "roster-token-1",
          });
        }
        return Response.json({
          invitationId: "invite-1",
          competitionId: null,
          token: "token-1",
          expiresAt: "2026-08-08T12:00:00.000Z",
          redeemPolicy: "single",
          maxRedemptions: 1,
        });
      }),
    });

    await client.organizations.createInvitation("org-1", { role: "member" });
    await client.teams.createRosterInvitation("org-1", "competition-1", "team-1", {
      role: "player",
    });

    expect(paths).toEqual([
      "/api/v1/organizations/org-1/invitations",
      "/api/v1/organizations/org-1/competitions/competition-1/teams/team-1/roster-invitations",
    ]);
    expect(Object.keys(client.authorization)).not.toContain("createInvitation");
  });

  it("parses EffectiveAccess permissions for allow and deny rows", async () => {
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async () =>
        Response.json({
          actorId: "actor-1",
          scope: { organizationId: "org-1", competitionId: "competition-1" },
          roles: [
            { scopeType: "organization", scopeId: "org-1", role: "member" },
            { scopeType: "competition", scopeId: "competition-1", role: "player" },
          ],
          permissions: [
            {
              permission: "competitions.read",
              allowed: true,
              decidedAt: "competition",
            },
            {
              permission: "competitions.update",
              allowed: false,
              decidedAt: "competition",
            },
          ],
        }),
      ),
    });

    const access = await client.authorization.getEffectiveAccess(
      { organizationId: "org-1", competitionId: "competition-1" },
      ["competitions.read", "competitions.update"],
    );

    expect(access.roles).toHaveLength(2);
    expect(access.permissions).toEqual([
      { permission: "competitions.read", allowed: true, decidedAt: "competition" },
      { permission: "competitions.update", allowed: false, decidedAt: "competition" },
    ]);
  });
});
