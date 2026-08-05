import type { ActorId, CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { RosterMembershipRole } from "./competition-roster-membership.ts";

export const ROSTER_INVITATION_STATUS = {
  pending: "pending",
  accepted: "accepted",
  revoked: "revoked",
  expired: "expired",
} as const;

export type RosterInvitationStatus =
  (typeof ROSTER_INVITATION_STATUS)[keyof typeof ROSTER_INVITATION_STATUS];

export type RosterInvitationRedeemPolicy = "single" | "multi";

export interface RosterInvitation {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly role: RosterMembershipRole;
  readonly tokenHash: string;
  readonly status: RosterInvitationStatus;
  readonly invitedByActorId: ActorId;
  readonly expiresAt: Date;
  readonly acceptedByActorId: ActorId | null;
  readonly createdAt: Date;
  readonly redeemPolicy: RosterInvitationRedeemPolicy;
}

const ROSTER_MEMBERSHIP_ROLES: ReadonlySet<string> = new Set(["player", "captain", "vice_captain"]);

export function isRosterMembershipRole(value: string): value is RosterMembershipRole {
  return ROSTER_MEMBERSHIP_ROLES.has(value);
}
