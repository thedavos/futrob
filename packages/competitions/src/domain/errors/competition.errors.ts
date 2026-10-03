import { TaggedError, type Permission } from "@futrob/shared-kernel";

export class CompetitionNotFound extends TaggedError("CompetitionNotFound")<{
  code: "competitions.not_found";
  message: string;
}> {}

export class CompetitionNotDiscoverable extends TaggedError("CompetitionNotDiscoverable")<{
  code: "competitions.not_discoverable";
  message: string;
}> {}

export type GetDiscoverableCompetitionError = CompetitionNotDiscoverable;

export class InvalidCompetitionName extends TaggedError("InvalidCompetitionName")<{
  code: "competitions.invalid_name";
  message: string;
}> {}

export class InvalidCompetitionGameEdition extends TaggedError("InvalidCompetitionGameEdition")<{
  code: "competitions.invalid_game_edition";
  message: string;
}> {}

export class InvalidCompetitionTimeZone extends TaggedError("InvalidCompetitionTimeZone")<{
  code: "competitions.invalid_time_zone";
  message: string;
}> {}

export class CompetitionCreationKeyConflict extends TaggedError("CompetitionCreationKeyConflict")<{
  code: "competitions.creation_key_conflict";
  message: string;
}> {}

export class EntryCreationKeyConflict extends TaggedError("EntryCreationKeyConflict")<{
  code: "competitions.entry_creation_key_conflict";
  message: string;
}> {}

export type CreateCompetitionDraftError =
  | CompetitionProfileError
  | InvalidCompetitionName
  | InvalidCompetitionGameEdition
  | InvalidCompetitionTimeZone
  | CompetitionCreationKeyConflict
  | CompetitionAuthorizationForbidden;

export type UpdateCompetitionDraftError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | CompetitionProfileError
  | InvalidCompetitionName
  | InvalidCompetitionGameEdition
  | InvalidCompetitionTimeZone
  | InvalidCompetitionRules
  | CompetitionAuthorizationForbidden;

export type PublishCompetitionError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | InvalidCompetitionRules
  | CompetitionPublishBlocked
  | CompetitionAuthorizationForbidden;

export class CompetitionRegistrationClosed extends TaggedError("CompetitionRegistrationClosed")<{
  readonly code: "competitions.registration_closed";
  readonly message: string;
}> {}

export class CompetitionCapacityReached extends TaggedError("CompetitionCapacityReached")<{
  readonly code: "competitions.capacity_reached";
  readonly message: string;
}> {}

export class InvalidCompetitionTeamRange extends TaggedError("InvalidCompetitionTeamRange")<{
  readonly code: "competitions.invalid_team_range";
  readonly message: string;
}> {}

export class InvalidCompetitionSchedule extends TaggedError("InvalidCompetitionSchedule")<{
  readonly code: "competitions.invalid_schedule";
  readonly message: string;
}> {}

export class InvalidCompetitionCover extends TaggedError("InvalidCompetitionCover")<{
  readonly code: "competitions.invalid_cover";
  readonly message: string;
}> {}

export type CompetitionProfileError =
  | InvalidCompetitionTeamRange
  | InvalidCompetitionSchedule
  | InvalidCompetitionCover;

export type UpdateCompetitionCoverError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | InvalidCompetitionCover
  | CompetitionAuthorizationForbidden;

export type ApplyToCompetitionError =
  | CompetitionNotFound
  | CompetitionRegistrationClosed
  | CompetitionCapacityReached
  | EntryCreationKeyConflict;

export type OpenCompetitionRegistrationError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | InvalidCompetitionRules
  | CompetitionAuthorizationForbidden;

export type CloseCompetitionRegistrationError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | CompetitionAuthorizationForbidden;

export type JoinCompetitionError = CompetitionNotFound;

export class CompetitionMembershipNotFound extends TaggedError("CompetitionMembershipNotFound")<{
  code: "competitions.membership_not_found";
  message: string;
}> {}

export class CompetitionAuthorizationForbidden extends TaggedError(
  "CompetitionAuthorizationForbidden",
)<{
  code: "authorization.forbidden";
  message: string;
  permission: Permission;
}> {}

export type ChangeCompetitionMembershipRoleError =
  | CompetitionNotFound
  | CompetitionMembershipNotFound
  | CompetitionAuthorizationForbidden;

export class EntryNotFound extends TaggedError("EntryNotFound")<{
  code: "competitions.entry_not_found";
  message: string;
}> {}

export class EntryAlreadyDecided extends TaggedError("EntryAlreadyDecided")<{
  code: "competitions.entry_already_decided";
  message: string;
}> {}

export class CompetitionNotEditable extends TaggedError("CompetitionNotEditable")<{
  code: "competitions.not_editable";
  message: string;
}> {}

export class InvalidCompetitionRules extends TaggedError("InvalidCompetitionRules")<{
  code: "competitions.invalid_rules";
  message: string;
}> {}

export class CompetitionPublishBlocked extends TaggedError("CompetitionPublishBlocked")<{
  code: "competitions.publish_blocked";
  message: string;
}> {}

export type RegisterTeamEntryError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | CompetitionCapacityReached
  | EntryCreationKeyConflict
  | CompetitionAuthorizationForbidden;

export type RemoveCompetitionParticipantError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | EntryNotFound
  | CompetitionAuthorizationForbidden;

export type ApproveCompetitionEntryError =
  | EntryNotFound
  | EntryAlreadyDecided
  | CompetitionNotFound
  | CompetitionCapacityReached
  | CompetitionAuthorizationForbidden;

export type RejectCompetitionEntryError =
  | EntryNotFound
  | EntryAlreadyDecided
  | CompetitionAuthorizationForbidden;
