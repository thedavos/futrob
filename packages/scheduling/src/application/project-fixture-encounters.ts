import type { ClockPort, EncounterId } from "@futrob/shared-kernel";
import type { FixtureEncounter, FixturePlan } from "../domain/entities/fixture-plan.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import { planEncounters } from "../domain/policies/edit-fixture-encounter.ts";

export function concreteEncounters(plan: FixturePlan): FixtureEncounter[] {
  return [...planEncounters(plan)].filter(
    (encounter) => encounter.home.kind === "team" && encounter.away.kind === "team",
  );
}

export async function projectFixtureEncounter(
  deps: {
    readonly clock: ClockPort;
    readonly encounters: EncounterScheduleRepository;
    readonly matches: OfficialMatchRepository;
  },
  plan: FixturePlan,
  encounter: FixtureEncounter,
): Promise<void> {
  if (encounter.home.kind !== "team" || encounter.away.kind !== "team") return;
  await deps.encounters.upsert({
    encounterId: encounter.id,
    organizationId: plan.organizationId,
    competitionId: plan.competitionId,
    homeTeamId: encounter.home.teamId,
    awayTeamId: encounter.away.teamId,
    scheduledStartAt: encounter.scheduledStartAt,
    officialMatchCount: encounter.officialMatchCount,
  });
  if (!encounter.series) return;
  const createdAt = deps.clock.now();
  await deps.matches.upsertMany(
    encounter.series.officialMatches.map((match) => ({
      ...match,
      encounterId: encounter.id,
      organizationId: plan.organizationId,
      competitionId: plan.competitionId,
      status: "scheduled",
      createdAt,
    })),
  );
}

export async function projectFixturePlan(
  deps: {
    readonly clock: ClockPort;
    readonly encounters: EncounterScheduleRepository;
    readonly matches: OfficialMatchRepository;
  },
  plan: FixturePlan,
): Promise<void> {
  await Promise.all(
    concreteEncounters(plan).map((encounter) => projectFixtureEncounter(deps, plan, encounter)),
  );
}

export async function unprojectFixturePlan(
  deps: {
    readonly encounters: EncounterScheduleRepository;
    readonly matches: OfficialMatchRepository;
  },
  plan: FixturePlan,
): Promise<void> {
  const encounterIds: EncounterId[] = concreteEncounters(plan).map((encounter) => encounter.id);
  await Promise.all([
    deps.encounters.deleteByEncounterIds(encounterIds),
    deps.matches.voidByEncounterIds(encounterIds),
  ]);
}
