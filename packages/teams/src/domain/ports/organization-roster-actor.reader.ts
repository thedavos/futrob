import type { ActorId, CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type { RosterMembershipRole } from "../entities/competition-roster-membership.ts";

export interface OrganizationRosterActorAssignment {
  readonly actorId: ActorId;
  readonly competitionId: CompetitionId;
  readonly role: RosterMembershipRole;
}

export interface OrganizationRosterActorReader {
  listByOrganizationActors(input: {
    readonly organizationId: OrganizationId;
    readonly actorIds: readonly ActorId[];
  }): Promise<readonly OrganizationRosterActorAssignment[]>;
}
