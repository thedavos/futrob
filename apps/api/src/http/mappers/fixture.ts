import type { FixturePlanDto } from "@futrob/api-contracts";
import type { FixturePlan } from "@futrob/scheduling";

export function fixturePlanDto(plan: FixturePlan): FixturePlanDto {
  return {
    ...plan,
    seed: [...plan.seed],
    stages: plan.stages.map((stage) => ({
      ...stage,
      rounds: stage.rounds.map((round) => ({
        ...round,
        scheduledStartAt: round.scheduledStartAt.toISOString(),
        encounters: round.encounters.map((encounter) => ({
          ...encounter,
          scheduledStartAt: encounter.scheduledStartAt.toISOString(),
        })),
      })),
    })),
  };
}
