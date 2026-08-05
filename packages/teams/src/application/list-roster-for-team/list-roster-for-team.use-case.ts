import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { CompetitionRosterMembership } from "../../domain/entities/competition-roster-membership.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";

export interface ListRosterForTeamInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
}

export class ListRosterForTeamUseCase {
  constructor(private readonly rosters: CompetitionRosterMembershipRepository) {}

  async execute(input: ListRosterForTeamInput): Promise<readonly CompetitionRosterMembership[]> {
    return this.rosters.listByTeam(input.organizationId, input.competitionId, input.teamId);
  }
}
