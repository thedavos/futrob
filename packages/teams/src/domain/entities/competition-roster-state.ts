import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export interface CompetitionRosterState {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly lockedAt: Date | null;
}
