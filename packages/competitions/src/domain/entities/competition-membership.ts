import type { ActorId, CompetitionId, OrganizationId } from "@futrob/shared-kernel";

export type CompetitionMembershipRole = "staff" | "captain" | "player";

export interface CompetitionMembership {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly actorId: ActorId;
  readonly role: CompetitionMembershipRole;
  readonly createdAt: Date;
}
