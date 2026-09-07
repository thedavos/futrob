import type {
  CompetitionRosterMembershipDto,
  PlayerTeamMembershipDto,
  RosterInvitationInboxItemDto,
  RosterInvitationMetaDto,
  RosterStateDto,
  TeamDto,
  TeamExternalClubConnectionDto,
} from "@futrob/api-contracts";
import type {
  CompetitionRosterMembership,
  CompetitionRosterState,
  CreateRosterInvitationResult,
  ExternalClubConnection,
  RosterInvitation,
  RosterMembershipRole,
  Team,
} from "@futrob/teams";

export function teamDto(team: Team): TeamDto {
  return {
    id: team.id,
    organizationId: team.organizationId,
    name: team.name,
    createdAt: team.createdAt.toISOString(),
  };
}

export function rosterMembershipDto(
  membership: CompetitionRosterMembership,
): CompetitionRosterMembershipDto {
  return {
    id: membership.id,
    organizationId: membership.organizationId,
    competitionId: membership.competitionId,
    teamId: membership.teamId,
    playerProfileId: membership.playerProfileId,
    gameAccountId: membership.gameAccountId,
    role: membership.role,
    createdAt: membership.createdAt.toISOString(),
  };
}

export function rosterInvitationMetaDto(
  invitation: CreateRosterInvitationResult,
): RosterInvitationMetaDto {
  return {
    invitationId: invitation.invitationId,
    organizationId: invitation.organizationId,
    competitionId: invitation.competitionId,
    teamId: invitation.teamId,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  };
}

const UNKNOWN_INVITER_DISPLAY_NAME = "Sin nombre público";

export function rosterInvitationInboxItemDto(input: {
  readonly invitation: RosterInvitation;
  readonly team: Team | null;
  readonly externalClub: ExternalClubConnection | null;
  readonly inviterRole: RosterMembershipRole | null;
}): RosterInvitationInboxItemDto {
  const { invitation, team, externalClub } = input;
  const teamName = team?.name ?? "Equipo";
  return {
    invitationId: invitation.id,
    organizationId: invitation.organizationId,
    competitionId: invitation.competitionId,
    teamId: invitation.teamId,
    teamName,
    clubName: externalClub?.externalClubName ?? teamName,
    crestUrl: null,
    role: invitation.role,
    status: invitation.status,
    invitedBy: {
      displayName:
        invitation.invitedByDisplayName ??
        invitation.invitedByGamertag ??
        UNKNOWN_INVITER_DISPLAY_NAME,
      gamertag: invitation.invitedByGamertag,
      role: input.inviterRole,
    },
    recipientIdentifier: invitation.inviteeIdentifier,
    message: invitation.message,
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
    respondedAt: invitation.respondedAt?.toISOString() ?? null,
  };
}

export function rosterStateDto(state: CompetitionRosterState): RosterStateDto {
  return {
    organizationId: state.organizationId,
    competitionId: state.competitionId,
    teamId: state.teamId,
    lockedAt: state.lockedAt?.toISOString() ?? null,
  };
}

export function teamExternalClubDto(
  connection: ExternalClubConnection,
): TeamExternalClubConnectionDto {
  return {
    teamId: connection.teamId,
    providerKey: connection.providerKey,
    externalClubId: connection.externalClubId,
    externalClubName: connection.externalClubName,
    platform: connection.platform,
    gameEdition: connection.gameEdition,
  };
}

export function playerTeamMembershipDto(input: {
  readonly membership: CompetitionRosterMembership;
  readonly team: Team;
  readonly active: boolean;
}): PlayerTeamMembershipDto {
  return {
    membership: rosterMembershipDto(input.membership),
    team: teamDto(input.team),
    active: input.active,
  };
}
