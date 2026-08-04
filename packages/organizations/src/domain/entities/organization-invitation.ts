import type { ActorId, CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type { InviteRole } from "../value-objects/organization-membership-role.ts";

export const INVITATION_STATUS = {
  pending: "pending",
  accepted: "accepted",
  revoked: "revoked",
  expired: "expired",
} as const;

export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

export interface OrganizationInvitation {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly competitionId?: CompetitionId | null;
  readonly role: InviteRole;
  readonly tokenHash: string;
  readonly email?: string | null;
  readonly status: InvitationStatus;
  readonly invitedByActorId: ActorId;
  readonly expiresAt: Date;
  readonly acceptedByActorId?: ActorId | null;
  readonly createdAt: Date;
}
