import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { TeamRosterManagementDetail } from "@/application/teams/team-roster-management.use-case.ts";
import { teamRosterManagementDetailDto } from "./team-management.ts";

describe("teamRosterManagementDetailDto", () => {
  it("fills missing public names at the HTTP boundary", () => {
    const organizationId = asOrganizationId("org-1");
    const competitionId = asCompetitionId("competition-1");
    const teamId = asTeamId("team-1");
    const value: TeamRosterManagementDetail = {
      team: {
        id: teamId,
        organizationId,
        name: "Barranco FC",
        createdAt: new Date("2026-08-11T12:00:00.000Z"),
        createdByActorId: asActorId("actor-1"),
        creationKey: null,
      },
      entry: {
        id: "entry-1",
        organizationId,
        competitionId,
        teamId,
        status: "pending",
        createdAt: new Date("2026-08-11T12:00:00.000Z"),
        creationKey: null,
      },
      roster: { state: "open", memberCount: 1, maxSize: 11, lockedAt: null },
      externalClub: null,
      members: [
        {
          membership: {
            id: "membership-1",
            organizationId,
            competitionId,
            teamId,
            playerProfileId: "profile-1",
            gameAccountId: null,
            role: "player",
            createdAt: new Date("2026-08-11T12:00:00.000Z"),
          },
          presentation: { displayName: null, avatarUrl: null },
        },
      ],
    };

    expect(teamRosterManagementDetailDto(value).members[0]?.presentation.displayName).toBe(
      "Jugador sin nombre público",
    );
  });
});
