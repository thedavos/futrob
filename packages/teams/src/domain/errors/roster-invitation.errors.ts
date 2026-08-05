import { TaggedError } from "@futrob/shared-kernel";
import type {
  RosterCompetitionConflict,
  RosterFull,
  RosterLocked,
  TeamNotFound,
} from "./team.errors.ts";

export type { RosterCompetitionConflict, RosterFull, RosterLocked, TeamNotFound };

export class RosterInvitationNotFound extends TaggedError("RosterInvitationNotFound")<{
  code: "teams.roster_invitation_not_found";
  message: string;
}> {}

export class RosterInvitationInvalid extends TaggedError("RosterInvitationInvalid")<{
  code: "teams.roster_invitation_invalid";
  message: string;
}> {}

export class RosterInvitationExpired extends TaggedError("RosterInvitationExpired")<{
  code: "teams.roster_invitation_expired";
  message: string;
}> {}

export class RosterInvitationRevoked extends TaggedError("RosterInvitationRevoked")<{
  code: "teams.roster_invitation_revoked";
  message: string;
}> {}

export class InvalidRosterInvitationRole extends TaggedError("InvalidRosterInvitationRole")<{
  code: "teams.invalid_roster_role";
  message: string;
  role: string;
}> {}

export type CreateRosterInvitationError = InvalidRosterInvitationRole | TeamNotFound;

export type AcceptRosterInvitationError =
  | RosterInvitationNotFound
  | RosterInvitationInvalid
  | RosterInvitationExpired
  | RosterInvitationRevoked
  | TeamNotFound
  | RosterFull
  | RosterLocked
  | RosterCompetitionConflict;
