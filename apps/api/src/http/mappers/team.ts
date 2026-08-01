import type {
  CompetitionRosterMembershipDto,
  PlayerTeamMembershipDto,
  TeamDto,
} from "@futrob/api-contracts";
import type { CompetitionRosterMembership, Team } from "@futrob/teams";

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
