import type { CompetitionRepository } from "@futrob/competitions";
import type {
  CompetitionRescheduleRules,
  CompetitionRescheduleRulesPort,
} from "@futrob/scheduling";
import type { CountAcceptedReschedulesInput } from "@/adapters/scheduling/schedule-change-request.repository.ts";

const UNLIMITED_RESCHEDULES = Number.MAX_SAFE_INTEGER;

export class CompetitionRescheduleRulesAdapter implements CompetitionRescheduleRulesPort {
  constructor(
    private readonly deps: {
      readonly competitions: Pick<CompetitionRepository, "findById">;
      readonly requests: {
        countAcceptedByTeam(input: CountAcceptedReschedulesInput): Promise<number>;
      };
    },
  ) {}

  async getRules(input: {
    readonly organizationId: CountAcceptedReschedulesInput["organizationId"];
    readonly competitionId: CountAcceptedReschedulesInput["competitionId"];
  }): Promise<CompetitionRescheduleRules> {
    const draft = await this.deps.competitions.findById(input.organizationId, input.competitionId);
    const stage = draft?.rules.regularStage ?? draft?.rules.knockoutStage ?? null;
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
}
