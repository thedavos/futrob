import type { CompetitionRepository } from "@futrob/competitions";
import {
  selectRescheduleStageRules,
  type CompetitionRescheduleRules,
  type CompetitionRescheduleRulesPort,
  type FixturePlanRepository,
  type FixtureStage,
  type FixtureStageId,
} from "@futrob/scheduling";
import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type { CountAcceptedReschedulesInput } from "@/adapters/scheduling/schedule-change-request.repository.ts";

const UNLIMITED_RESCHEDULES = Number.MAX_SAFE_INTEGER;

export class CompetitionRescheduleRulesAdapter implements CompetitionRescheduleRulesPort {
  constructor(
    private readonly deps: {
      readonly competitions: Pick<CompetitionRepository, "findById">;
      readonly fixtures: Pick<FixturePlanRepository, "listActive">;
      readonly requests: {
        countAcceptedByTeam(input: CountAcceptedReschedulesInput): Promise<number>;
      };
    },
  ) {}

  async getRules(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly stageId: FixtureStageId;
  }): Promise<CompetitionRescheduleRules> {
    const draft = await this.deps.competitions.findById(input.organizationId, input.competitionId);
    const stage = selectRescheduleStageRules({
      regularStage: draft?.rules.regularStage ?? null,
      knockoutStage: draft?.rules.knockoutStage ?? null,
      stageKind: await this.stageKind(input.organizationId, input.competitionId, input.stageId),
    });
    if (!stage) {
      return { allowRescheduling: false, maxReschedulesPerTeam: 0 };
    }
    return {
      allowRescheduling: stage.allowRescheduling,
      maxReschedulesPerTeam: stage.maxReschedulesPerTeam ?? UNLIMITED_RESCHEDULES,
    };
  }

  countAppliedReschedules(input: CountAcceptedReschedulesInput): Promise<number> {
    return this.deps.requests.countAcceptedByTeam(input);
  }

  private async stageKind(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    stageId: FixtureStageId,
  ): Promise<FixtureStage["kind"] | null> {
    const plans = await this.deps.fixtures.listActive(organizationId, competitionId);
    for (const plan of plans) {
      const stage = plan.stages.find((entry) => entry.id === stageId);
      if (stage) return stage.kind;
    }
    return null;
  }
}
