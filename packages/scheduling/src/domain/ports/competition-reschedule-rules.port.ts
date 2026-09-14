import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export interface CompetitionRescheduleRules {
  readonly allowRescheduling: boolean;
  readonly maxReschedulesPerTeam: number;
}

export interface CompetitionRescheduleRulesPort {
  getRules(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
  }): Promise<CompetitionRescheduleRules>;
  countAppliedReschedules(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly teamId: TeamId;
  }): Promise<number>;
}
