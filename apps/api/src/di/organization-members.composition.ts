import { ListOrganizationMembersUseCase } from "@futrob/organizations";
import type { AuthorizationPort } from "@futrob/shared-kernel";
import { OrganizationMemberAccessSummarizerAdapter } from "@/adapters/authorization/organization-member-access.ts";
import type { OrganizationsModule } from "./organizations.module.ts";
import type { IdentityModule } from "./identity.module.ts";
import type { CompetitionsModule } from "./competitions.module.ts";
import type { TeamsModule } from "./teams.module.ts";

export function createOrganizationMemberDirectory(input: {
  readonly authorization: AuthorizationPort;
  readonly organizations: OrganizationsModule;
  readonly identity: IdentityModule;
  readonly competitions: CompetitionsModule;
  readonly teams: TeamsModule;
}) {
  return new ListOrganizationMembersUseCase({
    authorization: input.authorization,
    memberships: input.organizations.repositories.memberships,
    contacts: input.identity.contacts,
    access: new OrganizationMemberAccessSummarizerAdapter({
      competitions: input.competitions.repository,
      competitionMemberships: input.competitions.membershipRepository,
      rosters: input.teams.repositories.rosterActors,
      grants: input.organizations.repositories.grants,
      platformRoles: input.organizations.repositories.platformRoles,
    }),
  });
}
