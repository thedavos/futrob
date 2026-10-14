import { err, ok, type ActorId, type Result } from "@futrob/shared-kernel";
import {
  ENTRY_INVITATION_CHANNEL,
  ENTRY_INVITATION_STATUS,
  type EntryInvitation,
} from "../entities/entry-invitation.ts";
import {
  EntryInvitationAlreadyDecided,
  EntryInvitationExpired,
  EntryInvitationForbidden,
  EntryInvitationRevoked,
  type EntryInvitationEligibilityError,
} from "../errors/entry-invitation.errors.ts";

/**
 * Whether `actorId` may answer the invitation now. A directed invitation the same actor
 * already accepted stays eligible so a retried acceptance returns the same entry.
 */
export function assessEntryInvitation(input: {
  readonly invitation: EntryInvitation;
  readonly actorId: ActorId;
  readonly now: Date;
}): Result<EntryInvitation, EntryInvitationEligibilityError> {
  const { invitation, actorId, now } = input;
  if (
    invitation.channel === ENTRY_INVITATION_CHANNEL.directed &&
    invitation.inviteeActorId !== actorId
  ) {
    return err(
      new EntryInvitationForbidden({
        code: "competitions.entry_invitation_forbidden",
        message: "The invitation is addressed to another player",
      }),
    );
  }
  if (invitation.status === ENTRY_INVITATION_STATUS.revoked) {
    return err(
      new EntryInvitationRevoked({
        code: "competitions.entry_invitation_revoked",
        message: "The invitation was revoked",
      }),
    );
  }
  if (invitation.status === ENTRY_INVITATION_STATUS.accepted) return ok(invitation);
  if (invitation.status === ENTRY_INVITATION_STATUS.declined) {
    return err(
      new EntryInvitationAlreadyDecided({
        code: "competitions.entry_invitation_already_decided",
        message: "The invitation was already declined",
      }),
    );
  }
  if (invitation.expiresAt && invitation.expiresAt.getTime() <= now.getTime()) {
    return err(
      new EntryInvitationExpired({
        code: "competitions.entry_invitation_expired",
        message: "The invitation has expired",
      }),
    );
  }
  return ok(invitation);
}
