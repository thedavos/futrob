import type { GetMyTeamsResponse, PlayerTeamMembershipDto } from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import {
  buildOrganizationInvitationShareUrl,
  invitableRosterRoles,
  isRosterWritable,
  rosterInvitationBlock,
  sortTeamsActiveFirst,
  teamMembershipForCompetition,
  teamScopeOf,
} from "./index.ts";

const date = "2026-09-01T00:00:00.000Z";

function team(
  id: string,
  input: { competitionId: string; organizationId?: string; name?: string; active?: boolean },
): PlayerTeamMembershipDto {
  const organizationId = input.organizationId ?? "org-1";
  return {
    membership: {
      id,
      organizationId,
      competitionId: input.competitionId,
      teamId: `team-${id}`,
      playerProfileId: "profile-1",
      gameAccountId: null,
      role: "captain",
      createdAt: date,
    },
    team: { id: `team-${id}`, organizationId, name: input.name ?? id, createdAt: date },
    active: input.active ?? false,
  };
}

function teams(
  items: readonly PlayerTeamMembershipDto[],
  activeRosterMembershipId: string | null = null,
): GetMyTeamsResponse {
  return { teams: [...items], activeRosterMembershipId };
}

describe("teamMembershipForCompetition", () => {
  it("prefers the active roster membership in the competition", () => {
    const mine = teams(
      [team("a", { competitionId: "c-1" }), team("b", { competitionId: "c-1" })],
      "b",
    );
    expect(teamMembershipForCompetition(mine, "c-1", "org-1")?.membership.id).toBe("b");
  });

  it("falls back to the first membership when the active one is elsewhere", () => {
    const mine = teams(
      [team("a", { competitionId: "c-1" }), team("b", { competitionId: "c-2" })],
      "b",
    );
    expect(teamMembershipForCompetition(mine, "c-1", "org-1")?.membership.id).toBe("a");
  });

  it("finds no Team when the actor plays none in the competition", () => {
    expect(teamMembershipForCompetition(teams([]), "c-1", "org-1")).toBeUndefined();
  });

  it("finds no Team when the competition belongs to another organization than the route's", () => {
    const mine = teams([team("a", { competitionId: "c-1", organizationId: "org-2" })]);
    expect(teamMembershipForCompetition(mine, "c-1", "org-1")).toBeUndefined();
    expect(teamMembershipForCompetition(mine, "c-1", null)?.membership.id).toBe("a");
  });
});

describe("teamScopeOf", () => {
  it("reads the organization, competition and Team of a membership", () => {
    expect(teamScopeOf(team("a", { competitionId: "c-1" }))).toEqual({
      organizationId: "org-1",
      competitionId: "c-1",
      teamId: "team-a",
    });
  });
});

describe("roster rules", () => {
  it("accepts roster changes only while the entry is pending or approved", () => {
    expect(isRosterWritable("pending")).toBe(true);
    expect(isRosterWritable("approved")).toBe(true);
    expect(isRosterWritable("rejected")).toBe(false);
  });

  it("offers every role only to who may manage roster roles", () => {
    expect(invitableRosterRoles(true)).toEqual(["player", "vice_captain", "captain"]);
    expect(invitableRosterRoles(false)).toEqual(["player"]);
  });

  it("says why a new invitation would not let anyone join", () => {
    const roster = { state: "open", memberCount: 3, maxSize: 4, lockedAt: null } as const;
    const entry = { status: "approved" } as const;
    const detail = (overrides: object) =>
      ({ entry: { ...entry }, roster: { ...roster }, ...overrides }) as Parameters<
        typeof rosterInvitationBlock
      >[0];
    expect(rosterInvitationBlock(detail({}))).toBeNull();
    expect(rosterInvitationBlock(detail({ entry: { status: "rejected" } }))).toBe("entry_closed");
    expect(rosterInvitationBlock(detail({ roster: { ...roster, state: "closed" } }))).toBe(
      "roster_closed",
    );
    expect(rosterInvitationBlock(detail({ roster: { ...roster, memberCount: 4 } }))).toBe(
      "roster_full",
    );
  });
});

describe("sortTeamsActiveFirst", () => {
  it("lists the active Team first, then by name", () => {
    const sorted = sortTeamsActiveFirst([
      team("z", { competitionId: "c-1", name: "Zorros" }),
      team("a", { competitionId: "c-2", name: "Águilas" }),
      team("m", { competitionId: "c-3", name: "Mantas", active: true }),
    ]);
    expect(sorted.map((item) => item.team.name)).toEqual(["Mantas", "Águilas", "Zorros"]);
  });
});

describe("buildOrganizationInvitationShareUrl", () => {
  it("builds the web acceptance link with an encoded token", () => {
    expect(buildOrganizationInvitationShareUrl("https://futrob.app/", "a b")).toBe(
      "https://futrob.app/invitations/accept/a%20b",
    );
  });
});
