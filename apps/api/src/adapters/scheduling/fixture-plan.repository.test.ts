import { asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { generateFixturePlan } from "@futrob/scheduling";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryEncounterScheduleRepository } from "./encounter-schedule.repository.ts";
import { InMemoryFixturePlanRepository } from "./fixture-plan.repository.ts";

function plan(organization = "org-1") {
  const seed = [asTeamId("team-a"), asTeamId("team-b")];
  return generateFixturePlan({
    organizationId: asOrganizationId(organization),
    competitionId: asCompetitionId("competition-1"),
    generationVersion: 1,
    rulesVersion: 1,
    format: "league",
    timeZone: "America/Lima",
    startsAt: new Date("2026-09-01T01:00:00.000Z"),
    roundIntervalDays: 7,
    officialMatchCounts: { regular: 1, knockout: 2 },
    seed,
    homeAndAway: false,
  });
}

describe("InMemoryFixturePlanRepository", () => {
  it("converges concurrent generation to one fixture", async () => {
    const repository = new InMemoryFixturePlanRepository();
    const fixture = plan();
    const [left, right] = await Promise.all([repository.save(fixture), repository.save(fixture)]);

    expect([left.created, right.created].sort((a, b) => Number(a) - Number(b))).toEqual([
      false,
      true,
    ]);
    expect(left.plan).toEqual(right.plan);
  });

  it("scopes reads and optimistic edits by organization", async () => {
    const repository = new InMemoryFixturePlanRepository();
    const fixture = plan();
    await repository.save(fixture);

    expect(
      await repository.findById(asOrganizationId("org-2"), fixture.competitionId, fixture.id),
    ).toBeNull();
    const updated = await repository.update({ ...fixture, timeZone: "UTC" });
    const stale = await repository.update({ ...fixture, timeZone: "America/Bogota" });

    expect(updated?.revision).toBe(2);
    expect(stale).toBeNull();
  });

  it("materializes concrete pairings for the official-match workflow and skips byes", async () => {
    const encounters = new InMemoryEncounterScheduleRepository();
    const repository = new InMemoryFixturePlanRepository(encounters);
    const fixture = generateFixturePlan({
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("competition-1"),
      generationVersion: 1,
      rulesVersion: 1,
      format: "league",
      timeZone: "America/Lima",
      startsAt: new Date("2026-09-01T01:00:00.000Z"),
      roundIntervalDays: 7,
      officialMatchCounts: { regular: 1, knockout: 2 },
      seed: [asTeamId("team-a"), asTeamId("team-b"), asTeamId("team-c")],
      homeAndAway: false,
    });

    await repository.save(fixture);

    const generatedEncounters = fixture.stages.flatMap((stage) =>
      stage.rounds.flatMap((round) => round.encounters),
    );
    const concrete = generatedEncounters.find(
      (encounter) => encounter.home.kind === "team" && encounter.away.kind === "team",
    );
    const bye = generatedEncounters.find(
      (encounter) => encounter.home.kind === "bye" || encounter.away.kind === "bye",
    );
    expect(concrete).toBeDefined();
    expect(bye).toBeDefined();
    expect(await encounters.findById(concrete!.id)).toMatchObject({
      organizationId: fixture.organizationId,
      competitionId: fixture.competitionId,
    });
    expect(await encounters.findById(bye!.id)).toBeNull();
  });
});
