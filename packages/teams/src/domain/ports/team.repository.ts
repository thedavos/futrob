import type { OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { Team } from "../entities/team.ts";

export interface TeamRepository {
  findById(organizationId: OrganizationId, teamId: TeamId): Promise<Team | null>;
  findByCreationKey(creationKey: string): Promise<Team | null>;
  listByOrganization?(organizationId: OrganizationId): Promise<readonly Team[]>;
  save(team: Team): Promise<Team>;
}
