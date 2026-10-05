import type { CompetitionId, EncounterId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { FixtureStageId } from "../entities/fixture-plan.ts";

/** Reschedule rules owned by Competitions for the stage of one Encounter. */
export interface CompetitionRescheduleRules {
  readonly allowRescheduling: boolean;
  readonly maxReschedulesPerTeam: number;
  /** Carried for the owner contract; its enforcement semantics are not decided yet. */
  readonly minimumNoticeHours: number;
  readonly requiresOpponentApproval: boolean;
  readonly requiresOrganizerApproval: boolean;
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
