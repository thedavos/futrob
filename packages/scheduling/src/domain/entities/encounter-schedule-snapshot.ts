import type { CompetitionId, EncounterId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { FixtureStageId } from "./fixture-plan.ts";

/** Read model shared by scheduling consumers and contextual authorization. */
export interface EncounterScheduleSnapshot {
  readonly encounterId: EncounterId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly stageId: FixtureStageId;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
}
