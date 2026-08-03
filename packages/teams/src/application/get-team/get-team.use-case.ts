import type { OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { Team } from "../../domain/entities/team.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";

export class GetTeamUseCase {
  constructor(private readonly teams: TeamRepository) {}

  async execute(input: {
    readonly organizationId: OrganizationId;
    readonly teamId: TeamId;
  }): Promise<Team | null> {
    return this.teams.findById(input.organizationId, input.teamId);
  }
}
