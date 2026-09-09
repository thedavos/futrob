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

  it("returns the earliest upcoming snapshot for the given teams", async () => {
    const repository = new InMemoryEncounterScheduleRepository();
    const now = new Date("2026-09-07T18:00:00.000Z");
    const later = {
      encounterId: asEncounterId("encounter-later"),
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("competition-1"),
      homeTeamId: asTeamId("home-1"),
      awayTeamId: asTeamId("away-2"),
      scheduledStartAt: new Date("2026-09-08T21:00:00.000Z"),
      officialMatchCount: 1 as const,
    };
    const next = {
      encounterId: asEncounterId("encounter-next"),
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("competition-1"),
      homeTeamId: asTeamId("away-2"),
      awayTeamId: asTeamId("home-1"),
      scheduledStartAt: new Date("2026-09-07T21:00:00.000Z"),
      officialMatchCount: 1 as const,
    };
    const past = {
      ...later,
      encounterId: asEncounterId("encounter-past"),
      scheduledStartAt: new Date("2026-09-07T17:00:00.000Z"),
    };
    const otherTeam = {
      ...later,
      encounterId: asEncounterId("encounter-other"),
      homeTeamId: asTeamId("home-9"),
      awayTeamId: asTeamId("away-9"),
      scheduledStartAt: new Date("2026-09-07T20:00:00.000Z"),
    };
    await repository.upsert(later);
    await repository.upsert(next);
    await repository.upsert(past);
    await repository.upsert(otherTeam);

    expect(await repository.findNextUpcomingByTeamIds([asTeamId("home-1")], now)).toEqual(next);
    expect(await repository.findNextUpcomingByTeamIds([], now)).toBeNull();
  });
});
