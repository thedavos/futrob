import { describe, expect, it } from "vite-plus/test";
import {
  competitionTeamManagementDetailResponseSchema,
  competitionTeamManagementListQuerySchema,
  competitionTeamManagementListResponseSchema,
} from "./schemas.ts";

describe("competition team management contracts", () => {
  it("keeps Team, CompetitionEntry, and Roster as distinct read-model fields", () => {
    const page = competitionTeamManagementListResponseSchema.parse({
      items: [
        {
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
          roster: { state: "open", memberCount: 1, maxSize: 11, lockedAt: null },
          externalClub: null,
        },
      ],
      nextCursor: null,
    });

    expect(page.items[0]?.team.name).toBe("Barranco FC");
    expect(page.items[0]?.entry.status).toBe("pending");
    expect(page.items[0]?.roster).toEqual({
      state: "open",
      memberCount: 1,
      maxSize: 11,
      lockedAt: null,
    });
  });

  it("parses a stable bounded page query", () => {
    expect(competitionTeamManagementListQuerySchema.parse({ limit: "25" })).toEqual({
      limit: 25,
    });
    expect(() => competitionTeamManagementListQuerySchema.parse({ limit: "51" })).toThrow();
  });

  it("requires server-resolved member presentation in detail", () => {
    const detail = competitionTeamManagementDetailResponseSchema.parse({
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
        status: "approved",
        createdAt: "2026-08-11T12:00:00.000Z",
      },
      roster: {
        state: "closed",
        memberCount: 1,
        maxSize: 11,
        lockedAt: "2026-08-11T13:00:00.000Z",
      },
      externalClub: null,
      members: [
        {
          membership: {
            id: "membership-1",
            organizationId: "org-1",
            competitionId: "competition-1",
            teamId: "team-1",
            playerProfileId: "profile-1",
            gameAccountId: null,
            role: "captain",
            createdAt: "2026-08-11T12:00:00.000Z",
          },
          presentation: {
            displayName: "Jugador sin nombre público",
            avatarUrl: null,
          },
        },
      ],
    });

    expect(detail.members[0]?.presentation.displayName).toBe("Jugador sin nombre público");
  });
});
