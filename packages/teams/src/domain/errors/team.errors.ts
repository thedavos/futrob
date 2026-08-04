import { TaggedError } from "@futrob/shared-kernel";

export class TeamNotFound extends TaggedError("TeamNotFound")<{
  code: "teams.not_found";
  message: string;
}> {}

export class InvalidTeamName extends TaggedError("InvalidTeamName")<{
  code: "teams.invalid_name";
  message: string;
}> {}

export class CreationKeyConflict extends TaggedError("CreationKeyConflict")<{
  code: "teams.creation_key_conflict";
  message: string;
}> {}

export class RosterCompetitionConflict extends TaggedError("RosterCompetitionConflict")<{
  code: "teams.roster_competition_conflict";
  message: string;
}> {}

export class GameAccountNotFound extends TaggedError("GameAccountNotFound")<{
  code: "teams.game_account_not_found";
  message: string;
}> {}

export class PlayerProfileNotFound extends TaggedError("PlayerProfileNotFound")<{
  code: "teams.player_profile_not_found";
  message: string;
}> {}

export class ActiveTeamNotOwned extends TaggedError("ActiveTeamNotOwned")<{
  code: "teams.active_team_not_owned";
  message: string;
}> {}

export class InvalidGameAccountIdentifier extends TaggedError("InvalidGameAccountIdentifier")<{
  code: "teams.invalid_game_account_identifier";
  message: string;
}> {}

export class InvalidGameEdition extends TaggedError("InvalidGameEdition")<{
  code: "teams.invalid_game_edition";
  message: string;
}> {}

export type CreateTeamError = InvalidTeamName | CreationKeyConflict;

export type AddToRosterError = TeamNotFound | RosterCompetitionConflict | GameAccountNotFound;

export type SetActiveTeamError = PlayerProfileNotFound | ActiveTeamNotOwned;

export type AddPlayerGameAccountError = InvalidGameAccountIdentifier | InvalidGameEdition;

export type AssociatePlayerExternalClubError = PlayerProfileNotFound;
