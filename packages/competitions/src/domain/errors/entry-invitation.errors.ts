import { TaggedError } from "@futrob/shared-kernel";
import type {
  CompetitionAuthorizationForbidden,
  CompetitionNotEditable,
  CompetitionNotFound,
} from "./competition.errors.ts";

export class EntryInvitationNotFound extends TaggedError("EntryInvitationNotFound")<{
  readonly code: "competitions.entry_invitation_not_found";
  readonly message: string;
}> {}

export class EntryInvitationForbidden extends TaggedError("EntryInvitationForbidden")<{
  readonly code: "competitions.entry_invitation_forbidden";
  readonly message: string;
}> {}

export class EntryInvitationRevoked extends TaggedError("EntryInvitationRevoked")<{
  readonly code: "competitions.entry_invitation_revoked";
  readonly message: string;
}> {}

export class EntryInvitationExpired extends TaggedError("EntryInvitationExpired")<{
  readonly code: "competitions.entry_invitation_expired";
  readonly message: string;
}> {}

export class EntryInvitationAlreadyDecided extends TaggedError("EntryInvitationAlreadyDecided")<{
  readonly code: "competitions.entry_invitation_already_decided";
  readonly message: string;
}> {}

export class EntryInvitationPendingConflict extends TaggedError("EntryInvitationPendingConflict")<{
  readonly code: "competitions.entry_invitation_pending_conflict";
  readonly message: string;
}> {}

export class InvalidEntryInvitationMessage extends TaggedError("InvalidEntryInvitationMessage")<{
  readonly code: "competitions.invalid_entry_invitation_message";
  readonly message: string;
}> {}

/** Why an actor cannot use an invitation right now. */
export type EntryInvitationEligibilityError =
  | EntryInvitationForbidden
  | EntryInvitationRevoked
  | EntryInvitationExpired
  | EntryInvitationAlreadyDecided;

export type ManageEntryInvitationsError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | CompetitionAuthorizationForbidden;

export type InviteTeamCaptainError =
  | ManageEntryInvitationsError
  | EntryInvitationPendingConflict
  | InvalidEntryInvitationMessage;

export type RevokeEntryInvitationError =
  | CompetitionAuthorizationForbidden
  | EntryInvitationNotFound
  | EntryInvitationAlreadyDecided;

export type ResolveEntryInvitationError =
  | EntryInvitationNotFound
  | CompetitionNotFound
  | CompetitionNotEditable
  | EntryInvitationEligibilityError;

export type PublicEntryInvitationLinkError =
  | EntryInvitationNotFound
  | EntryInvitationRevoked
  | CompetitionNotFound
  | CompetitionNotEditable;

export type DeclineEntryInvitationError = EntryInvitationNotFound | EntryInvitationEligibilityError;
