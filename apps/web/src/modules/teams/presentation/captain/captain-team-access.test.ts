import { describe, expect, it } from "vite-plus/test";
import type { GetMyTeamsResponse } from "@futrob/api-contracts";
import { membershipForCompetition } from "@/shared/presentation/shell/team-scope.ts";
import { isRosterWritable, resolveCaptainTeamAccess } from "./captain-team-access.ts";

const createdAt = "2026-08-11T00:00:00.000Z";

function teams(organizationId = "org-1"): GetMyTeamsResponse {
  return {
    activeRosterMembershipId: "member-1",
    teams: [
      {
        active: true,
        team: { id: "team-1", organizationId, name: "Cuervos FC", createdAt },
        membership: {
          id: "member-1",
          organizationId,
          competitionId: "competition-1",
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

/** What the hook feeds in once the teams query has succeeded. */
function loaded(competitionId: string) {
  return {
    competitionId,
    teamsStatus: "success",
    membership: membershipForCompetition(competitionId, teams()),
  } as const;
}

const allowed = { allowed: true, loading: false, unavailable: false };
const scope = { organizationId: "org-1", competitionId: "competition-1", teamId: "team-1" };

describe("resolveCaptainTeamAccess", () => {
  it("is ready when the actor has a team and the page permission", () => {
    expect(
      resolveCaptainTeamAccess({
        ...loaded("competition-1"),
        organizationId: "org-1",
        capability: allowed,
      }),
    ).toEqual({ kind: "ready", scope });
  });

  it("takes the organization from the membership on personal routes", () => {
    expect(
      resolveCaptainTeamAccess({
        ...loaded("competition-1"),
        organizationId: null,
        capability: allowed,
      }),
    ).toEqual({ kind: "ready", scope });
  });

  it("is forbidden without the page permission instead of looking empty", () => {
    expect(
      resolveCaptainTeamAccess({
        ...loaded("competition-1"),
        organizationId: "org-1",
        capability: { ...allowed, allowed: false },
      }),
    ).toEqual({ kind: "forbidden", scope });
  });

  it("has no team outside the competition or the route organization", () => {
    expect(
      resolveCaptainTeamAccess({
        ...loaded("competition-2"),
        organizationId: null,
        capability: allowed,
      }).kind,
    ).toBe("no-team");
    expect(
      resolveCaptainTeamAccess({
        ...loaded("competition-1"),
        organizationId: "org-2",
        capability: allowed,
      }).kind,
    ).toBe("no-team");
  });

  it("waits for teams and capabilities, and fails closed when either is unavailable", () => {
    const base = { ...loaded("competition-1"), organizationId: "org-1" } as const;
    expect(
      resolveCaptainTeamAccess({
        ...base,
        teamsStatus: "pending",
        membership: undefined,
        capability: allowed,
      }).kind,
    ).toBe("loading");
    expect(
      resolveCaptainTeamAccess({ ...base, capability: { ...allowed, loading: true } }).kind,
    ).toBe("loading");
    expect(
      resolveCaptainTeamAccess({
        ...base,
        teamsStatus: "error",
        membership: undefined,
        capability: allowed,
      }).kind,
    ).toBe("unavailable");
    expect(
      resolveCaptainTeamAccess({ ...base, capability: { ...allowed, unavailable: true } }).kind,
    ).toBe("unavailable");
  });
});

describe("isRosterWritable", () => {
  it("matches the API: only pending and approved entries accept roster changes", () => {
    expect(isRosterWritable("pending")).toBe(true);
    expect(isRosterWritable("approved")).toBe(true);
    expect(isRosterWritable("rejected")).toBe(false);
  });
});
