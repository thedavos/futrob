import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { asFixtureStageId } from "@futrob/scheduling";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryEncounterScheduleRepository } from "@/adapters/scheduling/encounter-schedule.repository.ts";
import { InMemoryExternalClubConnectionRepository } from "@/adapters/teams/external-club-connection.repository.ts";
import { SchedulingEncounterReader } from "./bridges.ts";

describe("SchedulingEncounterReader", () => {
  it("stage-reader-parity", async () => {
    const schedules = new InMemoryEncounterScheduleRepository();
    const snapshot = {
      encounterId: asEncounterId("encounter-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("competition-1"),
      stageId: asFixtureStageId("stage-league-1"),
      homeTeamId: asTeamId("home-1"),
      awayTeamId: asTeamId("away-1"),
      scheduledStartAt: new Date("2026-09-01T01:00:00.000Z"),
      officialMatchCount: 1 as const,
    };
    await schedules.upsert(snapshot);

    const read = await new SchedulingEncounterReader(
      schedules,
      new InMemoryExternalClubConnectionRepository(),
    ).getById(snapshot.encounterId);

    expect(read?.stageId).toBe(snapshot.stageId);
  });
});
