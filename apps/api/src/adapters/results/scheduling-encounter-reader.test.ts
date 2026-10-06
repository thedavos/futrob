import {
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { asFixtureStageId } from "@futrob/scheduling";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryEncounterScheduleRepository } from "@/adapters/scheduling/encounter-schedule.repository.ts";
import { InMemoryOfficialMatchRepository } from "@/adapters/scheduling/official-match.repository.ts";
import { InMemoryExternalClubConnectionRepository } from "@/adapters/teams/external-club-connection.repository.ts";
import { SchedulingEncounterReader } from "./bridges.ts";

const snapshot = {
  encounterId: asEncounterId("encounter-1"),
  organizationId: asOrganizationId("org-1"),
  competitionId: asCompetitionId("competition-1"),
  stageId: asFixtureStageId("stage-league-1"),
  homeTeamId: asTeamId("home-1"),
  awayTeamId: asTeamId("away-1"),
  scheduledStartAt: new Date("2026-09-01T01:00:00.000Z"),
  officialMatchCount: 2 as const,
};

async function readWith(slot2StartAt: Date | null) {
  const schedules = new InMemoryEncounterScheduleRepository();
  await schedules.upsert(snapshot);
  const matches = new InMemoryOfficialMatchRepository();
  if (slot2StartAt) {
    await matches.saveSchedules([
      {
        id: asOfficialMatchSlotId("slot-2"),
        encounterId: snapshot.encounterId,
        organizationId: snapshot.organizationId,
        competitionId: snapshot.competitionId,
        slot: 2,
        status: "scheduled",
        scheduledStartAt: slot2StartAt,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    ]);
  }
  return new SchedulingEncounterReader(
    schedules,
    matches,
    new InMemoryExternalClubConnectionRepository(),
  ).getById(snapshot.encounterId);
}

describe("SchedulingEncounterReader", () => {
  it("stage-reader-parity", async () => {
    expect((await readWith(null))?.stageId).toBe(snapshot.stageId);
  });

  it("reads a moved slot 2 start next to the Encounter start of slot 1", async () => {
    const read = await readWith(new Date("2026-09-02T01:00:00.000Z"));

    expect(read?.scheduledStartAt).toEqual(new Date("2026-09-01T01:00:00.000Z"));
    expect(read?.officialMatchStarts).toEqual([
      { slot: 1, scheduledStartAt: new Date("2026-09-01T01:00:00.000Z") },
      { slot: 2, scheduledStartAt: new Date("2026-09-02T01:00:00.000Z") },
    ]);
  });

  it("starts every slot with the Encounter when no slot row stores its own start", async () => {
    expect((await readWith(null))?.officialMatchStarts).toEqual([
      { slot: 1, scheduledStartAt: new Date("2026-09-01T01:00:00.000Z") },
      { slot: 2, scheduledStartAt: new Date("2026-09-01T01:00:00.000Z") },
    ]);
  });
});
