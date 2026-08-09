import { randomUUID } from "node:crypto";
import {
  DeleteAccessGrantUseCase,
  GetEffectiveAccessUseCase,
  ListAccessGrantsUseCase,
  RequirePermissionUseCase,
  UpsertAccessGrantUseCase,
  AssignSuperuserUseCase,
  ChangeOrganizationRoleUseCase,
  RevokeSuperuserUseCase,
} from "@futrob/organizations";
import type { ActorId, TransactionPort } from "@futrob/shared-kernel";
import {
  ContextualAuthorizationAdapter,
  contextualOrganizationRolePermissions,
} from "@/adapters/authorization/contextual-authorization.adapter.ts";
import type { CompetitionsModule } from "./competitions.module.ts";
import type { OrganizationsModule } from "./organizations.module.ts";
import type { TeamsModule } from "./teams.module.ts";
import type { SchedulingModule } from "./scheduling.module.ts";
import { ListActorAccessibleCompetitionsUseCase } from "@/application/authorization/list-actor-accessible-competitions.use-case.ts";

export function createAuthorizationModule(input: {
  readonly organizations: OrganizationsModule;
  readonly competitions: CompetitionsModule;
  readonly teams: TeamsModule;
  readonly transaction: TransactionPort;
  readonly scheduling: SchedulingModule;
}) {
  const authorization = new ContextualAuthorizationAdapter({
    organizations: input.organizations.repositories.organizations,
    organizationMemberships: input.organizations.repositories.memberships,
    competitionMemberships: input.competitions.membershipRepository,
    competitions: input.competitions.repository,
    entries: input.competitions.entryRepository,
    teams: input.teams.repositories.teams,
    profiles: input.teams.repositories.profiles,
    rosters: input.teams.repositories.rosters,
    grants: input.organizations.repositories.grants,
    platformRoles: input.organizations.repositories.platformRoles,
    encounters: input.scheduling.encounters,
  });
  const shared = {
    authorization,
    grants: input.organizations.repositories.grants,
    audit: input.organizations.repositories.audit,
    memberships: input.organizations.repositories.memberships,
    transaction: input.transaction,
    mutationLock: input.organizations.repositories.mutationLock,
    clock: { now: () => new Date() },
    ids: { generate: () => randomUUID() },
  };
  const platformRoles = input.organizations.repositories.platformRoles;
  const audit = input.organizations.repositories.audit;
  return {
    port: authorization,
    requirePermission: new RequirePermissionUseCase(authorization),
    getEffectiveAccess: new GetEffectiveAccessUseCase(authorization),
    listAccessibleCompetitions: new ListActorAccessibleCompetitionsUseCase({
      competitions: input.competitions.repository,
      competitionMemberships: input.competitions.membershipRepository,
      profiles: input.teams.repositories.profiles,
      rosters: input.teams.repositories.rosters,
      entries: input.competitions.entryRepository,
    }),
    listGrants: new ListAccessGrantsUseCase(shared),
    upsertGrant: new UpsertAccessGrantUseCase(shared),
    deleteGrant: new DeleteAccessGrantUseCase(shared),
    changeOrganizationRole: new ChangeOrganizationRoleUseCase({
      ...shared,
      memberships: input.organizations.repositories.memberships,
      roleCapabilities: { permissionsForRole: contextualOrganizationRolePermissions },
    }),
    assignSuperuser: new AssignSuperuserUseCase({
      ...shared,
      platformRoles: input.organizations.repositories.platformRoles,
    }),
    revokeSuperuser: new RevokeSuperuserUseCase({
      ...shared,
      platformRoles,
    }),
    async bootstrapInitialSuperuser(actorId: ActorId) {
      const now = shared.clock.now();
      return input.transaction.runInTransaction(async () => {
        const assignment = await platformRoles.assignInitialSuperuserIfEmpty({
          actorId,
          role: "superuser",
          assignedByActorId: actorId,
          createdAt: now,
        });
        if (!assignment) return false;
        await audit.append({
          id: shared.ids.generate(),
          actorId,
          action: "authorization.superuser.bootstrapped",
          targetActorId: actorId,
          organizationId: null,
          scopeType: "platform",
          scopeId: "platform",
          permission: null,
          before: null,
          after: assignment,
          reason: "Configured INITIAL_SUPERUSER_ACTOR_ID",
          createdAt: now,
        });
        return true;
      });
    },
  };
}

export type AuthorizationModule = ReturnType<typeof createAuthorizationModule>;
