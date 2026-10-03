import { asActorId } from "@futrob/shared-kernel";
import { parseOrganizationSlug } from "@futrob/organizations";
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

export const PERFORMANCE_HOME_CAPTAIN = asActorId("performance-home-captain");
export const PERFORMANCE_AWAY_CAPTAIN = asActorId("performance-away-captain");

export async function seedPerformanceModule(modules: AppModules): Promise<void> {
  const actor = asActorId("actor-1");
  const date = new Date("2026-08-01T00:00:00Z");
  await modules.organizations.repositories.organizations.create({
    id: performanceScope.organizationId,
    name: "Performance",
    normalizedName: "performance",
    slug: parseOrganizationSlug("performance")!,
    timeZone: "America/Lima",
    logo: { kind: "monogram" },
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
    await modules.teams.externalClubConnections.upsert({
      teamId: team,
      providerKey: "ea-clubs",
      externalClubId: team === performanceHome ? "club-a" : "club-b",
      externalClubName: team,
      gameEdition: "fc26",
      platform: "playstation",
    });
  }
  for (const [actorId, teamId] of [
    [PERFORMANCE_HOME_CAPTAIN, performanceHome],
    [PERFORMANCE_AWAY_CAPTAIN, performanceAway],
  ] as const) {
    const profile = await modules.teams.repositories.profiles.saveIfAbsent({
      id: `profile-${actorId}`,
      actorId,
      createdAt: date,
    });
    await modules.teams.repositories.rosters.add({
      id: `roster-${actorId}`,
      organizationId: performanceScope.organizationId,
      competitionId: performanceScope.competitionId,
      teamId,
      playerProfileId: profile.id,
      gameAccountId: null,
      role: "captain",
      createdAt: date,
    });
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
    await modules.results.results.append(result);
    const projected = await modules.statistics.useCases.projectOfficialResult.execute({
      officialResultId: result.id,
    });
    if (!projected.isOk()) throw projected.error;
  }
}
