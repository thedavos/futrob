import { describe, expect, it } from "vite-plus/test";
import { teamIdForCompetition } from "./team-scope.ts";

describe("teamIdForCompetition", () => {
  it("prefers the active roster membership for the competition", () => {
    const teamId = teamIdForCompetition("c1", {
      activeRosterMembershipId: "m2",
      teams: [
        {
          active: false,
          team: {
            id: "t1",
            organizationId: "o1",
            name: "A",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
          membership: {
            id: "m1",
            organizationId: "o1",
            competitionId: "c1",
            teamId: "t1",
            playerProfileId: "p1",
            gameAccountId: null,
            role: "player",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        },
        {
          active: true,
          team: {
            id: "t2",
            organizationId: "o1",
            name: "B",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
          membership: {
            id: "m2",
            organizationId: "o1",
            competitionId: "c1",
            teamId: "t2",
            playerProfileId: "p1",
            gameAccountId: null,
            role: "captain",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        },
      ],
    });
    expect(teamId).toBe("t2");
  });

  it("returns undefined when the actor has no team in the competition", () => {
    expect(
      teamIdForCompetition("c9", {
        activeRosterMembershipId: null,
        teams: [],
      }),
    ).toBeUndefined();
  });
});
