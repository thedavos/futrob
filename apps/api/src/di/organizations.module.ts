import {
  AcceptInvitationUseCase,
  CheckOrganizationNameUseCase,
  CreateInvitationUseCase,
  CreateOrganizationUseCase,
  ListMembershipsForActorUseCase,
  InspectCompetitionInvitationUseCase,
  type InvitationRepository,
  type MembershipRepository,
  type OrganizationRepository,
} from "@futrob/organizations";
import type { AuthorizationPort } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import {
  CryptoIdGenerator,
  Sha256InvitationTokenPort,
  SystemClock,
} from "@/adapters/organizations/crypto-ports.ts";
import { createInMemoryOrganizationStore } from "@/adapters/organizations/in-memory.repository.ts";
import {
  PostgresInvitationRepository,
  PostgresMembershipRepository,
  PostgresOrganizationRepository,
} from "@/adapters/organizations/postgres.repository.ts";
import { createInMemoryAuthorizationStore } from "@/adapters/authorization/in-memory.repository.ts";
import {
  PostgresAccessGrantRepository,
  PostgresAuthorizationAuditRepository,
  PostgresAuthorizationMutationLock,
  PostgresPlatformRoleRepository,
} from "@/adapters/authorization/postgres.repository.ts";

export interface OrganizationsModuleDependencies {
  readonly pool: Pool | undefined;
  readonly authorization: AuthorizationPort;
}

export function createOrganizationsModule(deps: OrganizationsModuleDependencies) {
  const clock = new SystemClock();
  const ids = new CryptoIdGenerator();
  const tokens = new Sha256InvitationTokenPort();

  let organizations: OrganizationRepository;
  let memberships: MembershipRepository;
  let invitations: InvitationRepository;
  const authorizationStore = deps.pool
    ? {
        grants: new PostgresAccessGrantRepository(deps.pool),
        platformRoles: new PostgresPlatformRoleRepository(deps.pool),
        audit: new PostgresAuthorizationAuditRepository(deps.pool),
        mutationLock: new PostgresAuthorizationMutationLock(deps.pool),
      }
    : createInMemoryAuthorizationStore();

  if (deps.pool) {
    organizations = new PostgresOrganizationRepository(deps.pool);
    memberships = new PostgresMembershipRepository(deps.pool);
    invitations = new PostgresInvitationRepository(deps.pool);
  } else {
    const store = createInMemoryOrganizationStore();
    organizations = store.organizations;
    memberships = store.memberships;
    invitations = store.invitations;
  }

  const ports = {
    organizations,
    memberships,
    invitations,
    authorization: deps.authorization,
    clock,
    ids,
    tokens,
  };

  return {
    createOrganization: new CreateOrganizationUseCase(ports),
    checkOrganizationName: new CheckOrganizationNameUseCase(organizations),
    listMembershipsForActor: new ListMembershipsForActorUseCase(memberships),
    createInvitation: new CreateInvitationUseCase(ports),
    acceptInvitation: new AcceptInvitationUseCase(ports),
    inspectCompetitionInvitation: new InspectCompetitionInvitationUseCase(ports),
    repositories: {
      organizations,
      memberships,
      invitations,
      ...authorizationStore,
    },
  };
}

export type OrganizationsModule = ReturnType<typeof createOrganizationsModule>;
