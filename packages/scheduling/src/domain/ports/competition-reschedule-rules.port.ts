import type { CompetitionId, EncounterId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { FixtureStageId } from "../entities/fixture-plan.ts";

export interface CompetitionRescheduleRules {
  readonly allowRescheduling: boolean;
  readonly maxReschedulesPerTeam: number;
}

export interface CompetitionRescheduleRulesPort {
  getRules(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly stageId: FixtureStageId;
  }): Promise<CompetitionRescheduleRules>;
  countAppliedReschedules(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly encounterId: EncounterId;
    readonly teamId: TeamId;
  }): Promise<number>;
}
