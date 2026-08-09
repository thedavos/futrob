import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryEncounterScheduleRepository } from "./encounter-schedule.repository.ts";

describe("InMemoryEncounterScheduleRepository", () => {
  it("defensively refuses cross-tenant reparenting for an existing ID", async () => {
    const repository = new InMemoryEncounterScheduleRepository();
    const original = {
      encounterId: asEncounterId("encounter-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("competition-1"),
      homeTeamId: asTeamId("home-1"),
      awayTeamId: asTeamId("away-1"),
      scheduledStartAt: new Date("2026-08-10T20:00:00.000Z"),
      officialMatchCount: 1 as const,
    };
    await repository.upsert(original);

    const overwritten = await repository.upsert({
      ...original,
      organizationId: asOrganizationId("org-2"),
    });

    expect(overwritten).toBeNull();
    expect(await repository.findById(original.encounterId)).toEqual(original);
  });
});
