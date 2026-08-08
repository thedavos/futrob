import { TaggedError } from "@futrob/shared-kernel";

export class CompetitionNotFound extends TaggedError("CompetitionNotFound")<{
  code: "competitions.not_found";
  message: string;
}> {}

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
  | InvalidCompetitionName
  | InvalidCompetitionGameEdition
  | InvalidCompetitionTimeZone
  | CompetitionCreationKeyConflict;

export type UpdateCompetitionDraftError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | InvalidCompetitionName
  | InvalidCompetitionGameEdition
  | InvalidCompetitionTimeZone
  | InvalidCompetitionRules;

export type PublishCompetitionError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | InvalidCompetitionRules
  | CompetitionPublishBlocked;

export type JoinCompetitionError = CompetitionNotFound;

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
  | EntryCreationKeyConflict;

export type RemoveCompetitionParticipantError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | EntryNotFound;

export type ApproveCompetitionEntryError =
  | EntryNotFound
  | EntryAlreadyDecided
  | CompetitionNotFound;

export type RejectCompetitionEntryError = EntryNotFound | EntryAlreadyDecided;
