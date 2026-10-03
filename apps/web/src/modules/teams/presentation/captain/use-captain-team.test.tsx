// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { GetMyTeamsResponse } from "@futrob/api-contracts";
import { TEAM_PERMISSION } from "@futrob/teams";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { useCaptainTeam } from "./use-captain-team.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

const createdAt = "2026-08-11T00:00:00.000Z";

function myTeams(competitionId = "competition-1"): GetMyTeamsResponse {
  return {
    activeRosterMembershipId: "member-1",
    teams: [
      {
        active: true,
        team: { id: "team-1", organizationId: "org-1", name: "Cuervos FC", createdAt },
        membership: {
          id: "member-1",
          organizationId: "org-1",
          competitionId,
          teamId: "team-1",
          playerProfileId: "player-1",
          gameAccountId: null,
          role: "captain",
          createdAt,
        },
      },
    ],
  };
}

/**
 * Serves the teams list and effective access. Access is only granted for the exact team scope
 * of the membership, so a wrong scope reaching the permission query would read as denied.
 */
function stubApi(input: {
  readonly teams: GetMyTeamsResponse;
  readonly granted: readonly string[];
}) {
  const accessRequests: URLSearchParams[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/v1/players/me/teams")) return Response.json(input.teams);
      const query = new URL(url, "http://localhost").searchParams;
      accessRequests.push(query);
      const inTeamScope =
        query.get("organizationId") === "org-1" &&
        query.get("competitionId") === "competition-1" &&
        query.get("teamId") === "team-1";
      const requested = (query.get("permissions") ?? "").split(",").filter(Boolean);
      return Response.json({
        actorId: "actor-1",
        scope: {},
        roles: [],
        permissions: requested.map((permission) => ({
          permission,
          allowed: inTeamScope && input.granted.includes(permission),
          decidedAt: "team",
        })),
        evaluatedAt: "2026-08-11T12:00:00.000Z",
      });
    }),
  );
  return accessRequests;
}

function renderCaptainTeam(
  required: "manageRoster" | "manageInvitations",
  organizationId = "org-1",
) {
  return renderHook(
    () => useCaptainTeam({ competitionId: "competition-1", organizationId, required }),
    { wrapper: QueryTestProvider },
  );
}

const CAPTAIN = [
  TEAM_PERMISSION.rosterManage,
  TEAM_PERMISSION.rosterRolesManage,
  TEAM_PERMISSION.invitationsManage,
  TEAM_PERMISSION.externalClubManage,
];
const VICE_CAPTAIN = [
  TEAM_PERMISSION.rosterManage,
  TEAM_PERMISSION.invitationsManage,
  TEAM_PERMISSION.externalClubManage,
];

describe("useCaptainTeam", () => {
  it("asks for access in the membership's team scope and opens the page for a captain", async () => {
    const requests = stubApi({ teams: myTeams(), granted: CAPTAIN });
    const { result } = renderCaptainTeam("manageRoster");

    expect(result.current.access.kind).toBe("loading");
    await waitFor(() => expect(result.current.access.kind).toBe("ready"));

    expect(result.current.capabilities).toEqual({
      manageRoster: true,
      manageRoles: true,
      manageInvitations: true,
      manageExternalClub: true,
    });
    expect(requests.at(-1)?.get("teamId")).toBe("team-1");
  });

  it("keeps secondary actions off for a vice-captain who cannot manage roles", async () => {
    stubApi({ teams: myTeams(), granted: VICE_CAPTAIN });
    const { result } = renderCaptainTeam("manageInvitations");

    await waitFor(() => expect(result.current.access.kind).toBe("ready"));
    expect(result.current.capabilities.manageRoles).toBe(false);
    expect(result.current.capabilities.manageInvitations).toBe(true);
  });

  it("is forbidden, with every action off, when the page permission is missing", async () => {
    stubApi({ teams: myTeams(), granted: [TEAM_PERMISSION.invitationsManage] });
    const { result } = renderCaptainTeam("manageRoster");

    await waitFor(() => expect(result.current.access.kind).toBe("forbidden"));
    expect(result.current.capabilities).toEqual({
      manageRoster: false,
      manageRoles: false,
      manageInvitations: false,
      manageExternalClub: false,
    });
  });

  it("has no team when the actor is not on a roster of this competition", async () => {
    stubApi({ teams: myTeams("competition-2"), granted: CAPTAIN });
    const { result } = renderCaptainTeam("manageRoster");

    await waitFor(() => expect(result.current.access.kind).toBe("no-team"));
    expect(result.current.capabilities.manageRoster).toBe(false);
  });

  it("fails closed when the teams request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    const { result } = renderCaptainTeam("manageRoster");

    await waitFor(() => expect(result.current.access.kind).toBe("unavailable"));
    expect(result.current.capabilities.manageRoster).toBe(false);
  });
});
