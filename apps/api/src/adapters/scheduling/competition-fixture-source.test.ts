import type { CompetitionDraft, CompetitionEntry } from "@futrob/competitions";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { CompetitionFixtureSourceAdapter } from "./competition-fixture-source.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const draft = {
  competition: {
    id: competitionId,
    organizationId,
    name: "Champions",
    status: "published",
    modality: "fc-clubs",
    gameEdition: "FC 26",
    platform: "playstation",
    region: "south-america",
    timeZone: "America/Lima",
    format: "groups-knockout",
    createdByActorId: asActorId("actor-1"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  },
  rules: {
    competitionId,
    version: 4,
    regularStage: {
      officialMatchesPerEncounter: 1,
      resolutionMode: "independent_matches",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowRescheduling: true,
      maxReschedulesPerTeam: 2,
      minimumRescheduleNoticeHours: 12,
      rescheduleRequiresOpponentApproval: true,
      rescheduleRequiresOrganizerApproval: false,
    },
    knockoutStage: {
      officialMatchesPerEncounter: 2,
      resolutionMode: "aggregate_score",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowRescheduling: true,
      maxReschedulesPerTeam: 2,
      minimumRescheduleNoticeHours: 12,
      rescheduleRequiresOpponentApproval: true,
      rescheduleRequiresOrganizerApproval: false,
    },
    awayGoalsEnabled: false,
    maxRosterSize: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
} satisfies CompetitionDraft;

describe("CompetitionFixtureSourceAdapter", () => {
  it("returns only approved participants in stable creation order", async () => {
    const entries = [
      entry("entry-2", "team-b", "approved", "2026-02-02"),
      entry("entry-1", "team-a", "approved", "2026-02-01"),
      entry("entry-3", "team-c", "pending", "2026-02-03"),
    ];
    const adapter = new CompetitionFixtureSourceAdapter({
      competitions: { findById: async () => draft },
      entries: { listByCompetition: async () => entries },
    });

    const source = await adapter.load({ organizationId, competitionId });

    expect(source?.approvedParticipants).toEqual([asTeamId("team-a"), asTeamId("team-b")]);
    expect(source?.officialMatchCounts).toEqual({ regular: 1, knockout: 2 });
  });
});

function entry(
  id: string,
  teamId: string,
  status: CompetitionEntry["status"],
  createdAt: string,
): CompetitionEntry {
  return {
    id,
    organizationId,
    competitionId,
    teamId: asTeamId(teamId),
    status,
    createdAt: new Date(createdAt),
    creationKey: null,
  };
}
