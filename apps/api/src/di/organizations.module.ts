import {
  AcceptInvitationUseCase,
  CreateInvitationUseCase,
  CreateOrganizationUseCase,
  ListMembershipsForActorUseCase,
  type InvitationRepository,
  type MembershipRepository,
  type OrganizationRepository,
} from "@futrob/organizations";
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

export interface OrganizationsModuleDependencies {
  readonly pool: Pool | undefined;
}

export function createOrganizationsModule(deps: OrganizationsModuleDependencies) {
  const clock = new SystemClock();
  const ids = new CryptoIdGenerator();
  const tokens = new Sha256InvitationTokenPort();

  let organizations: OrganizationRepository;
  let memberships: MembershipRepository;
  let invitations: InvitationRepository;

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

  const ports = { organizations, memberships, invitations, clock, ids, tokens };

  return {
    createOrganization: new CreateOrganizationUseCase(ports),
    listMembershipsForActor: new ListMembershipsForActorUseCase(memberships),
    createInvitation: new CreateInvitationUseCase(ports),
    acceptInvitation: new AcceptInvitationUseCase(ports),
  };
}

export type OrganizationsModule = ReturnType<typeof createOrganizationsModule>;
