import type { CompetitionId, EncounterId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { FixtureStageId } from "../entities/fixture-plan.ts";

/** Reschedule rules owned by Competitions for the stage of one Encounter. */
export interface CompetitionRescheduleRules {
  readonly allowRescheduling: boolean;
  readonly maxReschedulesPerTeam: number;
  /** Exact minimum hours before current future slots and proposed starts; zero disables notice. */
  readonly minimumNoticeHours: number;
  readonly proposalExpiryHours: number;
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
