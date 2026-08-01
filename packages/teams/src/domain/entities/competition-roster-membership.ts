import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export type RosterMembershipRole = "player" | "captain" | "vice_captain";

export interface CompetitionRosterMembership {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly playerProfileId: string;
  readonly gameAccountId: string | null;
  readonly role: RosterMembershipRole;
  readonly createdAt: Date;
}
