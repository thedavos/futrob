import type { FixtureEncounter, FixturePlan } from "../domain/entities/fixture-plan.ts";
import type { EncounterCreatedEvent } from "../domain/events/encounter-created.event.ts";

/** One event per Team vs Team encounter; byes and placeholders create nothing to play yet. */
export function encounterCreatedEvents(
  plan: Pick<FixturePlan, "organizationId" | "competitionId">,
  encounters: readonly FixtureEncounter[],
  occurredAt: Date,
  correlationId?: string,
): EncounterCreatedEvent[] {
  return encounters.flatMap((encounter) => {
    if (encounter.home.kind !== "team" || encounter.away.kind !== "team") return [];
    const event = {
      eventName: "scheduling.encounter-created" as const,
      occurredAt: occurredAt.toISOString(),
      payload: {
        encounterId: encounter.id,
        organizationId: plan.organizationId,
        competitionId: plan.competitionId,
        stageId: encounter.stageId,
        roundId: encounter.roundId,
        homeTeamId: encounter.home.teamId,
        awayTeamId: encounter.away.teamId,
        scheduledStartAt: encounter.scheduledStartAt.toISOString(),
      },
    };
    return correlationId === undefined ? [event] : [{ ...event, correlationId }];
  });
}
