import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type { InviteRole } from "../value-objects/organization-membership-role.ts";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface OrganizationInvitation {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly role: InviteRole;
  readonly tokenHash: string;
  readonly email?: string | null;
  readonly status: InvitationStatus;
  readonly invitedByActorId: ActorId;
  readonly expiresAt: Date;
  readonly acceptedByActorId?: ActorId | null;
  readonly createdAt: Date;
}
