import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { teamsBrowserClient, TeamsClientError } from "./teams-browser-client.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("teamsBrowserClient management reads", () => {
  it("loads a bounded competition Team page", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ items: [], nextCursor: null }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await teamsBrowserClient.listCompetitionManagement("org/1", "competition/1", {
      cursor: "next cursor",
      limit: 10,
    });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/organizations/org%2F1/competitions/competition%2F1/team-management?limit=10&cursor=next+cursor",
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
  });

  it("keeps the typed support code when a detail read is forbidden", async () => {
    const requestId = "16feecf8-07f3-460e-8b09-e7c098445fde";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            code: "authorization.forbidden",
            messageKey: "errors.authorization.forbidden",
            requestId,
          },
          { status: 403, headers: { "X-Request-ID": requestId } },
        ),
      ),
    );

    const caught = await teamsBrowserClient
      .getCompetitionTeamManagement("org-1", "competition-1", "team-1")
      .catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(TeamsClientError);
    expect(caught).toMatchObject({
      status: 403,
      code: "authorization.forbidden",
      requestId,
    });
  });
});

describe("teamsBrowserClient management commands", () => {
  it("uses competition-scoped roster and club endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const path = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (path.endsWith("/roster/member-1")) {
        return Response.json({
          id: "member-1",
          organizationId: "org-1",
          competitionId: "competition-1",
          teamId: "team-1",
          playerProfileId: "player-1",
          gameAccountId: null,
          role: "captain",
          createdAt: "2026-08-11T00:00:00.000Z",
        });
      }
      return Response.json({
        teamId: "team-1",
        providerKey: "ea-clubs",
        externalClubId: "club-1",
        externalClubName: "Cuervos",
        platform: "common-gen5",
        gameEdition: "FC 26",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await teamsBrowserClient.changeRosterRole(
      "org-1",
      "competition-1",
      "team-1",
      "member-1",
      { role: "captain" },
    );
    await teamsBrowserClient.connectExternalClub("org-1", "competition-1", "team-1", {
      providerKey: "ea-clubs",
      externalClubId: "club-1",
      externalClubName: "Cuervos",
      platform: "common-gen5",
      gameEdition: "FC 26",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/organizations/org-1/competitions/competition-1/teams/team-1/roster/member-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/organizations/org-1/competitions/competition-1/teams/team-1/external-club",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("creates the canonical roster invitation payload", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        invitationId: "invitation-1",
        organizationId: "org-1",
        competitionId: "competition-1",
        teamId: "team-1",
        role: "player",
        status: "pending",
        expiresAt: "2026-08-12T00:00:00.000Z",
        createdAt: "2026-08-11T00:00:00.000Z",
        token: "secret-token",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const invitation = await teamsBrowserClient.createRosterInvitation(
      "org-1",
      "competition-1",
      "team-1",
      { role: "player", redeemPolicy: "multi" },
    );

    expect(invitation.token).toBe("secret-token");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/organizations/org-1/competitions/competition-1/teams/team-1/roster-invitations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ role: "player", redeemPolicy: "multi" }),
      }),
    );
  });
});
