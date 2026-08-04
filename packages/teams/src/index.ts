export type { ExternalClubConnection } from "./domain/entities/external-club-connection.ts";
export type { PlayerExternalClubAssociation } from "./domain/entities/player-external-club-association.ts";
export type { PlayerProfile } from "./domain/entities/player-profile.ts";
export type { Team } from "./domain/entities/team.ts";
export type {
  CompetitionRosterMembership,
  RosterMembershipRole,
} from "./domain/entities/competition-roster-membership.ts";
export type { ActiveTeamPreference } from "./domain/entities/active-team-preference.ts";
export {
  normalizeGameAccountIdentifier,
  type GamePlatform,
  type PlayerGameAccount,
} from "./domain/entities/player-game-account.ts";
export type { PlayerProfileRepository } from "./domain/ports/player-profile.repository.ts";
export type { PlayerGameAccountRepository } from "./domain/ports/player-game-account.repository.ts";
export type { PlayerExternalClubAssociationRepository } from "./domain/ports/player-external-club-association.repository.ts";
export type { TeamRepository } from "./domain/ports/team.repository.ts";
export type { CompetitionRosterMembershipRepository } from "./domain/ports/competition-roster-membership.repository.ts";
export type { ActiveTeamPreferenceRepository } from "./domain/ports/active-team-preference.repository.ts";

export {
  TeamNotFound,
  InvalidTeamName,
  CreationKeyConflict,
  RosterCompetitionConflict,
  GameAccountNotFound,
  PlayerProfileNotFound,
  ActiveTeamNotOwned,
  InvalidGameAccountIdentifier,
  InvalidGameEdition,
  type CreateTeamError,
  type AddToRosterError,
  type SetActiveTeamError,
  type AddPlayerGameAccountError,
  type AssociatePlayerExternalClubError,
} from "./domain/errors/team.errors.ts";

export { EnsurePlayerProfileUseCase } from "./application/ensure-player-profile/ensure-player-profile.use-case.ts";
export {
  AddPlayerGameAccountUseCase,
  type AddPlayerGameAccountInput,
} from "./application/add-player-game-account/add-player-game-account.use-case.ts";
export {
  AssociatePlayerExternalClubUseCase,
  type AssociatePlayerExternalClubInput,
} from "./application/associate-player-external-club/associate-player-external-club.use-case.ts";
export {
  GetPlayerProfileUseCase,
  type PlayerProfileDetails,
} from "./application/get-player-profile/get-player-profile.use-case.ts";
export {
  CreateTeamUseCase,
  type CreateTeamInput,
} from "./application/create-team/create-team.use-case.ts";
export { GetTeamUseCase } from "./application/get-team/get-team.use-case.ts";
export {
  AddToRosterUseCase,
  type AddToRosterInput,
} from "./application/add-to-roster/add-to-roster.use-case.ts";
export { ListRostersForPlayerUseCase } from "./application/list-rosters-for-player/list-rosters-for-player.use-case.ts";
export {
  SetActiveTeamUseCase,
  type SetActiveTeamInput,
} from "./application/set-active-team/set-active-team.use-case.ts";
export { GetActiveTeamUseCase } from "./application/get-active-team/get-active-team.use-case.ts";
