import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export type RosterMutationScope = {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
};

export interface RosterMutationPort {
  runExclusive<T>(scope: RosterMutationScope, operation: () => Promise<T>): Promise<T>;
}
