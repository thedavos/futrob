import { asActorId } from "@futrob/shared-kernel";
import { asFixtureStageId } from "@futrob/scheduling";
import type { AppModules } from "@/di/create-modules.ts";
import {
  performanceCompetition,
  performanceEntry,
  officialPerformanceResult,
} from "./team-performance.fixture.ts";
import {
  performancePair,
  performanceScope,
  performanceHome,
  performanceAway,
} from "../../../../packages/statistics/src/domain/policies/team-performance.fixture.ts";

export async function seedPerformanceModule(modules: AppModules): Promise<void> {
  const actor = asActorId("actor-1");
  const date = new Date("2026-08-01T00:00:00Z");
  await modules.organizations.repositories.organizations.create({
    id: performanceScope.organizationId,
    name: "Performance",
    normalizedName: "performance",
    createdAt: date,
    createdByActorId: actor,
  });
  await modules.organizations.repositories.memberships.add({
    organizationId: performanceScope.organizationId,
    actorId: actor,
    role: "organizer",
    createdAt: date,
  });
  await modules.competitions.repository.saveDraft(performanceCompetition());
  for (const team of [performanceHome, performanceAway]) {
    await modules.teams.repositories.teams.save({
      id: team,
      organizationId: performanceScope.organizationId,
      name: team,
      createdAt: date,
      createdByActorId: actor,
      creationKey: null,
    });
    await modules.competitions.entryRepository.save(performanceEntry(team));
  }
  for (const i of [1, 2, 3]) {
    const result = officialPerformanceResult(performancePair(i));
    await modules.scheduling.encounters.upsert({
      ...performanceScope,
      encounterId: result.encounterId,
      stageId: asFixtureStageId("fixture:stage:1"),
      homeTeamId: performanceHome,
      awayTeamId: performanceAway,
      scheduledStartAt: result.slots[0]!.occurredAt,
      officialMatchCount: 1,
    });
  }
}

export async function seedPerformanceResults(modules: AppModules): Promise<void> {
  for (const i of [1, 2, 3]) {
    const result = officialPerformanceResult(performancePair(i));
    await modules.results.results.save(result);
    const projected = await modules.statistics.useCases.projectOfficialResult.execute({
      officialResultId: result.id,
    });
    if (!projected.isOk()) throw projected.error;
  }
}
