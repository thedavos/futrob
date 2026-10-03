import type { CompetitionDraft } from "@futrob/competitions";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryCompetitionRepository } from "@/adapters/competitions/in-memory.repository.ts";
import { CompetitionTimeZoneAdapter } from "./competition-time-zone.adapter.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");

function draft(): CompetitionDraft {
  return {
    competition: {
      id: competitionId,
      organizationId,
      name: "Liga Futrob",
      status: "published",
      modality: "fc-clubs",
      gameEdition: "FC 26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdByActorId: asActorId("organizer-1"),
      createdAt: new Date("2026-07-31T12:00:00.000Z"),
      updatedAt: new Date("2026-07-31T12:00:00.000Z"),
    },
    rules: {
      competitionId,
      version: 1,
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
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: null,
      createdAt: new Date("2026-07-31T12:00:00.000Z"),
    },
  };
}

describe("CompetitionTimeZoneAdapter", () => {
  it("returns the competition IANA zone and hides a missing draft", async () => {
    const competitions = new InMemoryCompetitionRepository();
    await competitions.saveDraft(draft());
    const adapter = new CompetitionTimeZoneAdapter(competitions);

    await expect(adapter.getTimeZone({ organizationId, competitionId })).resolves.toBe(
      "America/Lima",
    );
    await expect(
      adapter.getTimeZone({
        organizationId: asOrganizationId("org-other"),
        competitionId,
      }),
    ).resolves.toBeNull();
  });
});
