import type { OrganizationId } from "@futrob/shared-kernel";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";

export class ListOrganizationTeamsUseCase {
  constructor(private readonly teams: TeamRepository) {}
  execute(input: { organizationId: OrganizationId }) {
    return this.teams.listByOrganization?.(input.organizationId) ?? Promise.resolve([]);
  }
}
