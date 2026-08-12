import { asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { generateFixturePlan } from "@futrob/scheduling";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryFixturePlanRepository } from "./fixture-plan.repository.ts";

function plan(organization = "org-1") {
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
    resolutionModes: { regular: "independent_matches", knockout: "aggregate_score" },
    seed: [asTeamId("team-a"), asTeamId("team-b")],
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

  it("scopes reads and optimistic encounter edits by organization", async () => {
    const repository = new InMemoryFixturePlanRepository();
    const fixture = plan();
    await repository.save(fixture);
    const encounter = fixture.stages[0]!.rounds[0]!.encounters[0]!;

    expect(
      await repository.findById(asOrganizationId("org-2"), fixture.competitionId, fixture.id),
    ).toBeNull();
    const updated = await repository.updateEncounter({
      organizationId: fixture.organizationId,
      competitionId: fixture.competitionId,
      fixturePlanId: fixture.id,
      revision: fixture.revision,
      encounter: { ...encounter, scheduledStartAt: new Date("2026-09-02T01:00:00.000Z") },
    });
    const stale = await repository.updateEncounter({
      organizationId: fixture.organizationId,
      competitionId: fixture.competitionId,
      fixturePlanId: fixture.id,
      revision: fixture.revision,
      encounter: { ...encounter, scheduledStartAt: new Date("2026-09-03T01:00:00.000Z") },
    });

    expect(updated?.revision).toBe(2);
    expect(stale).toBeNull();
  });

  it("occupies one generation version per competition", async () => {
    const repository = new InMemoryFixturePlanRepository();
    const first = plan();
    const shifted = generateFixturePlan({
      organizationId: first.organizationId,
      competitionId: first.competitionId,
      generationVersion: 1,
      rulesVersion: 1,
      format: "league",
      timeZone: "America/Lima",
      startsAt: new Date("2026-09-08T01:00:00.000Z"),
      roundIntervalDays: 7,
      officialMatchCounts: { regular: 1, knockout: 2 },
      resolutionModes: { regular: "independent_matches", knockout: "aggregate_score" },
      seed: [asTeamId("team-a"), asTeamId("team-b")],
      homeAndAway: false,
    });
    await repository.save(first);
    const replay = await repository.save(shifted);

    expect(replay.created).toBe(false);
    expect(replay.plan.id).toBe(first.id);
  });
});
