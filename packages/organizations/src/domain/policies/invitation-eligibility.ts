import { err, ok, type ActorId, type Result } from "@futrob/shared-kernel";
import {
  INVITATION_STATUS,
  REDEEM_POLICY,
  type OrganizationInvitation,
} from "../entities/organization-invitation.ts";
import {
  InvitationExhausted,
  InvitationExpired,
  InvitationInvalid,
  InvitationRevoked,
} from "../errors/invitation.errors.ts";

export type InvitationEligibilityError =
  | InvitationExhausted
  | InvitationExpired
  | InvitationInvalid
  | InvitationRevoked;

export function assessInvitationEligibility(input: {
  readonly invitation: OrganizationInvitation;
  readonly actorId: ActorId;
  readonly actorAlreadyRedeemed: boolean;
  readonly now: Date;
  readonly requireCompetition: boolean;
}): Result<OrganizationInvitation, InvitationEligibilityError> {
  const { invitation } = input;
  if (input.requireCompetition && !invitation.competitionId) {
    return err(
      new InvitationInvalid({
        code: "organizations.invitation_invalid",
        message: "Invitation does not target a competition",
      }),
    );
  }
  if (invitation.status === INVITATION_STATUS.revoked) {
    return err(
      new InvitationRevoked({
        code: "organizations.invitation_revoked",
        message: "Invitation has been revoked",
      }),
    );
  }
  if (
    invitation.status === INVITATION_STATUS.expired ||
    invitation.expiresAt.getTime() <= input.now.getTime()
  ) {
    return err(
      new InvitationExpired({
        code: "organizations.invitation_expired",
        message: "Invitation has expired",
      }),
    );
  }
  if (invitation.status === INVITATION_STATUS.accepted) {
    return invitation.acceptedByActorId === input.actorId ? ok(invitation) : invalidInvitation();
  }
  if (invitation.status !== INVITATION_STATUS.pending) {
    return invalidInvitation();
  }
  if (invitation.redeemPolicy === REDEEM_POLICY.multi) {
    if (input.actorAlreadyRedeemed) return ok(invitation);
    if (
      invitation.maxRedemptions === null ||
      invitation.redeemedCount >= invitation.maxRedemptions
    ) {
      return err(
        new InvitationExhausted({
          code: "organizations.invitation_exhausted",
          message: "Invitation has reached its maximum number of redemptions",
        }),
      );
    }
  }
  return ok(invitation);
}

function invalidInvitation(): Result<never, InvitationInvalid> {
  return err(
    new InvitationInvalid({
      code: "organizations.invitation_invalid",
      message: "Invitation is no longer valid",
    }),
  );
}
