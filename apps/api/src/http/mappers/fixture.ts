import type { FixturePlanDto } from "@futrob/api-contracts";
import type { FixturePlan } from "@futrob/scheduling";

export function fixturePlanDto(plan: FixturePlan): FixturePlanDto {
  return {
    id: plan.id,
    revision: plan.revision,
    status: plan.status,
    generationKey: plan.generationKey,
    organizationId: plan.organizationId,
    competitionId: plan.competitionId,
    rulesVersion: plan.rulesVersion,
    generationVersion: plan.generationVersion,
    format: plan.format,
    timeZone: plan.timeZone,
    homeAndAway: plan.homeAndAway,
    seed: [...plan.seed],
    stages: plan.stages.map((stage) => ({
      id: stage.id,
      kind: stage.kind,
      order: stage.order,
      rounds: stage.rounds.map((round) => ({
        id: round.id,
        stageId: round.stageId,
        number: round.number,
        scheduledStartAt: round.scheduledStartAt.toISOString(),
        encounters: round.encounters.map((encounter) => ({
          id: encounter.id,
          stageId: encounter.stageId,
          roundId: encounter.roundId,
          order: encounter.order,
          ...(encounter.groupId ? { groupId: encounter.groupId } : {}),
          home: encounter.home,
          away: encounter.away,
          scheduledStartAt: encounter.scheduledStartAt.toISOString(),
          officialMatchCount: encounter.officialMatchCount,
          series: encounter.series
            ? {
                id: encounter.series.id,
                resolutionMode: encounter.series.resolutionMode,
                officialMatches: encounter.series.officialMatches.map((match) => ({
                  id: match.id,
                  slot: match.slot,
                })),
              }
            : null,
        })),
      })),
    })),
  };
}
