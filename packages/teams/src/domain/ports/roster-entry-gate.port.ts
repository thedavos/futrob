import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export interface RosterEntryGatePort {
  canMutateRoster(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<boolean>;
}
