import { TaggedError, type OrganizationId } from "@futrob/shared-kernel";

export class InvitationNotFound extends TaggedError("InvitationNotFound")<{
  code: "organizations.invitation_not_found";
  message: string;
}> {}

export class InvitationInvalid extends TaggedError("InvitationInvalid")<{
  code: "organizations.invitation_invalid";
  message: string;
}> {}

export class InvitationExpired extends TaggedError("InvitationExpired")<{
  code: "organizations.invitation_expired";
  message: string;
}> {}

export class InvitationRevoked extends TaggedError("InvitationRevoked")<{
  code: "organizations.invitation_revoked";
  message: string;
}> {}

export class OrganizationNotFound extends TaggedError("OrganizationNotFound")<{
  code: "organizations.not_found";
  message: string;
  organizationId: OrganizationId;
}> {}

export class OrganizationForbidden extends TaggedError("OrganizationForbidden")<{
  code: "organizations.forbidden";
  message: string;
}> {}

export class InvalidInvitationRole extends TaggedError("InvalidInvitationRole")<{
  code: "organizations.invalid_role";
  message: string;
  role: string;
}> {}

/** Multi-redeem cupo (`maxRedemptions`) is fully consumed by other actors. */
export class InvitationExhausted extends TaggedError("InvitationExhausted")<{
  code: "organizations.invitation_exhausted";
  message: string;
}> {}

export class InvalidInvitationRedeemPolicy extends TaggedError("InvalidInvitationRedeemPolicy")<{
  code: "organizations.invalid_redeem_policy";
  message: string;
}> {}

export type AcceptInvitationError =
  | InvitationNotFound
  | InvitationInvalid
  | InvitationExpired
  | InvitationRevoked
  | InvitationExhausted
  | OrganizationNotFound;

export type CreateInvitationError =
  | InvalidInvitationRole
  | InvalidInvitationRedeemPolicy
  | OrganizationNotFound
  | OrganizationForbidden;
