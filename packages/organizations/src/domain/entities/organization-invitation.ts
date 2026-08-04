import type { ActorId, CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type { InviteRole } from "../value-objects/organization-membership-role.ts";

export const INVITATION_STATUS = {
  pending: "pending",
  accepted: "accepted",
  revoked: "revoked",
  expired: "expired",
} as const;

export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

/**
 * `single` keeps today's 1:1 semantics (one claim, `status` flips to `accepted`).
 * `multi` allows up to `maxRedemptions` distinct actors to redeem the same link;
 * `status` stays `pending` until expiry/revocation and cupo is tracked via
 * `redeemedCount` plus the per-actor redemption ledger (see `InvitationRepository`).
 */
export const REDEEM_POLICY = {
  single: "single",
  multi: "multi",
} as const;

export type RedeemPolicy = (typeof REDEEM_POLICY)[keyof typeof REDEEM_POLICY];

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
  readonly redeemPolicy: RedeemPolicy;
  /** Required (positive integer) when `redeemPolicy` is `multi`; `null` for `single`. */
  readonly maxRedemptions: number | null;
  /** Count of distinct actors who have redeemed this invitation so far. */
  readonly redeemedCount: number;
}
