import type { ActorId, CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export interface TeamRepresentation {
  readonly teamId: TeamId;
  readonly role: "captain" | "vice_captain";
}

/**
 * Whether an actor currently speaks for a Team in a competition: captain or
 * vice-captain of the Team's roster with an approved entry. Being staff or an
 * organizer never counts as representing a Team.
 */
export interface TeamRepresentationPort {
  findRepresentation(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly teamId: TeamId;
  }): Promise<TeamRepresentation | null>;
}
