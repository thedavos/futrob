export type { ExternalClubConnection } from "./domain/entities/external-club-connection.ts";
export type { PlayerExternalClubAssociation } from "./domain/entities/player-external-club-association.ts";
export type { PlayerProfile } from "./domain/entities/player-profile.ts";
export type { Team } from "./domain/entities/team.ts";
export type {
  CompetitionRosterMembership,
  RosterMembershipRole,
} from "./domain/entities/competition-roster-membership.ts";
export type { CompetitionRosterState } from "./domain/entities/competition-roster-state.ts";
export {
  ROSTER_INVITATION_STATUS,
  isRosterMembershipRole,
  type RosterInvitation,
  type RosterInvitationRedeemPolicy,
  type RosterInvitationStatus,
} from "./domain/entities/roster-invitation.ts";
export type { ActiveTeamPreference } from "./domain/entities/active-team-preference.ts";
export {
  normalizeGameAccountIdentifier,
  type GamePlatform,
  type PlayerGameAccount,
} from "./domain/entities/player-game-account.ts";
export {
  DEFAULT_MAX_ROSTER_SIZE,
  resolveMaxRosterSize,
} from "./domain/policies/roster-capacity.ts";
export type { PlayerProfileRepository } from "./domain/ports/player-profile.repository.ts";
export type { PlayerGameAccountRepository } from "./domain/ports/player-game-account.repository.ts";
export type { PlayerExternalClubAssociationRepository } from "./domain/ports/player-external-club-association.repository.ts";
export type { TeamRepository } from "./domain/ports/team.repository.ts";
export type { CompetitionRosterMembershipRepository } from "./domain/ports/competition-roster-membership.repository.ts";
export type { CompetitionRosterStateRepository } from "./domain/ports/competition-roster-state.repository.ts";
export type { ExternalClubConnectionRepository } from "./domain/ports/external-club-connection.repository.ts";
export type { RosterCapacityPort } from "./domain/ports/roster-capacity.port.ts";
export type { RosterEntryGatePort } from "./domain/ports/roster-entry-gate.port.ts";
export type {
  RosterMutationPort,
  RosterMutationScope,
} from "./domain/ports/roster-mutation.port.ts";
export type {
  RosterInvitationRepository,
  ClaimPendingOptions,
} from "./domain/ports/roster-invitation.repository.ts";
export type { RosterInvitationTokenPort } from "./domain/ports/roster-invitation-token.port.ts";
export type { ActiveTeamPreferenceRepository } from "./domain/ports/active-team-preference.repository.ts";
export type { RosterLockedEvent, ExternalClubConnectedEvent } from "./domain/events/team.events.ts";
export {
  ROSTER_ROLE_PERMISSIONS,
  TEAM_PERMISSION,
  TEAM_PERMISSIONS,
} from "./domain/policies/team-permissions.ts";

export {
  TeamNotFound,
  InvalidTeamName,
  CreationKeyConflict,
  RosterCompetitionConflict,
  RosterLocked,
  RosterEntryInactive,
  RosterFull,
  RosterMembershipNotFound,
  TeamAuthorizationForbidden,
  CaptainAlreadyAssigned,
  GameAccountNotFound,
  PlayerProfileNotFound,
  ActiveTeamNotOwned,
  InvalidGameAccountIdentifier,
  InvalidGameEdition,
  type CreateTeamError,
  type AddToRosterError,
  type ChangeRosterRoleError,
  type CloseRosterError,
  type OpenRosterError,
  type ConnectTeamExternalClubError,
  type SetActiveTeamError,
  type AddPlayerGameAccountError,
  type AssociatePlayerExternalClubError,
} from "./domain/errors/team.errors.ts";
export {
  RosterInvitationNotFound,
  RosterInvitationInvalid,
  RosterInvitationExpired,
  RosterInvitationRevoked,
  InvalidRosterInvitationRole,
  type CreateRosterInvitationError,
  type AcceptRosterInvitationError,
} from "./domain/errors/roster-invitation.errors.ts";

export { EnsurePlayerProfileUseCase } from "./application/ensure-player-profile/ensure-player-profile.use-case.ts";
export {
  AddPlayerGameAccountUseCase,
  type AddPlayerGameAccountInput,
} from "./application/add-player-game-account/add-player-game-account.use-case.ts";
export {
  LinkProviderExternalPlayerIdUseCase,
  type LinkProviderExternalPlayerIdInput,
  type LinkProviderExternalPlayerIdError,
} from "./application/link-provider-external-player-id/link-provider-external-player-id.use-case.ts";
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
export { ListOrganizationTeamsUseCase } from "./application/list-organization-teams/list-organization-teams.use-case.ts";
export {
  AddToRosterUseCase,
  type AddToRosterInput,
} from "./application/add-to-roster/add-to-roster.use-case.ts";
export {
  ListRosterForTeamUseCase,
  type ListRosterForTeamInput,
} from "./application/list-roster-for-team/list-roster-for-team.use-case.ts";
export {
  ChangeRosterRoleUseCase,
  type ChangeRosterRoleInput,
} from "./application/change-roster-role/change-roster-role.use-case.ts";
export {
  CloseRosterUseCase,
  type CloseRosterInput,
} from "./application/close-roster/close-roster.use-case.ts";
export {
  OpenRosterUseCase,
  type OpenRosterInput,
} from "./application/open-roster/open-roster.use-case.ts";
export {
  ConnectTeamExternalClubUseCase,
  type ConnectTeamExternalClubInput,
} from "./application/connect-team-external-club/connect-team-external-club.use-case.ts";
export { GetTeamExternalClubUseCase } from "./application/get-team-external-club/get-team-external-club.use-case.ts";
export { ListRostersForPlayerUseCase } from "./application/list-rosters-for-player/list-rosters-for-player.use-case.ts";
export {
  SetActiveTeamUseCase,
  type SetActiveTeamInput,
} from "./application/set-active-team/set-active-team.use-case.ts";
export { GetActiveTeamUseCase } from "./application/get-active-team/get-active-team.use-case.ts";
export {
  CreateRosterInvitationUseCase,
  type CreateRosterInvitationInput,
  type CreateRosterInvitationResult,
} from "./application/create-roster-invitation/create-roster-invitation.use-case.ts";
export {
  AcceptRosterInvitationUseCase,
  type AcceptRosterInvitationInput,
} from "./application/accept-roster-invitation/accept-roster-invitation.use-case.ts";
