import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { CompetitionRosterMembership } from "../entities/competition-roster-membership.ts";

export interface CompetitionRosterMembershipRepository {
  findById(id: string): Promise<CompetitionRosterMembership | null>;
  findByIdInScope(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
    id: string,
  ): Promise<CompetitionRosterMembership | null>;
  findByPlayerAndCompetition(
    playerProfileId: string,
    competitionId: CompetitionId,
  ): Promise<CompetitionRosterMembership | null>;
  findByTeamPlayerCompetition(
    teamId: TeamId,
    playerProfileId: string,
    competitionId: CompetitionId,
  ): Promise<CompetitionRosterMembership | null>;
  listByPlayerProfile(playerProfileId: string): Promise<readonly CompetitionRosterMembership[]>;
  listByTeam(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<readonly CompetitionRosterMembership[]>;
  add(membership: CompetitionRosterMembership): Promise<CompetitionRosterMembership | null>;
  update(membership: CompetitionRosterMembership): Promise<CompetitionRosterMembership>;
}
