import { randomUUID } from "node:crypto";
import {
  ApproveCompetitionEntryUseCase,
  ChangeCompetitionMembershipRoleUseCase,
  CreateCompetitionDraftUseCase,
  ListOrganizationCompetitionsUseCase,
  GetCompetitionDraftUseCase,
  GetDiscoverableCompetitionUseCase,
  GetTeamEntryUseCase,
  JoinCompetitionUseCase,
  ListDiscoverableCompetitionsUseCase,
  RegisterTeamEntryUseCase,
  RejectCompetitionEntryUseCase,
  UpdateCompetitionDraftUseCase,
  PublishCompetitionUseCase,
  OpenCompetitionRegistrationUseCase,
  ApplyToCompetitionUseCase,
  UpdateCompetitionCoverUseCase,
  CloseCompetitionRegistrationUseCase,
  ListCompetitionParticipantsUseCase,
  ListAccessibleCompetitionsUseCase,
  RemoveCompetitionParticipantUseCase,
  type CompetitionDiscoveryReader,
  type CompetitionEntryRepository,
  type CompetitionMembershipRepository,
  type CompetitionRepository,
} from "@futrob/competitions";
import type {
  OrganizationRepository,
  AuthorizationAuditRepository,
  MembershipRepository,
} from "@futrob/organizations";
import type {
  AuthorizationMutationLockPort,
  AuthorizationPort,
  TransactionPort,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import {
  InMemoryCompetitionEntryRepository,
  PostgresCompetitionEntryRepository,
} from "@/adapters/competitions/competition-entry.repositories.ts";
import { InMemoryCompetitionDiscoveryReader } from "@/adapters/competitions/in-memory-discovery.reader.ts";
import {
  InMemoryCompetitionMembershipRepository,
  InMemoryCompetitionRepository,
} from "@/adapters/competitions/in-memory.repository.ts";
import { PostgresCompetitionDiscoveryReader } from "@/adapters/competitions/postgres-discovery.reader.ts";
import {
  PostgresCompetitionMembershipRepository,
  PostgresCompetitionRepository,
} from "@/adapters/competitions/postgres.repository.ts";
import { contextualCompetitionRolePermissions } from "@/adapters/authorization/contextual-authorization.adapter.ts";
import { ExploreCompetitionsQuery } from "@/application/discovery/explore-competitions.query.ts";

export function createCompetitionsModule(input: {
  readonly pool: Pool | undefined;
  readonly competitions?: CompetitionRepository;
  readonly authorization: AuthorizationPort;
  readonly organizationMemberships: MembershipRepository;
  readonly audit: AuthorizationAuditRepository;
  readonly transaction: TransactionPort;
  readonly mutationLock: AuthorizationMutationLockPort;
  readonly organizations: OrganizationRepository;
}) {
  const competitions: CompetitionRepository =
    input.competitions ??
    (input.pool
      ? new PostgresCompetitionRepository(input.pool)
      : new InMemoryCompetitionRepository());
  const memberships: CompetitionMembershipRepository = input.pool
    ? new PostgresCompetitionMembershipRepository(input.pool)
    : new InMemoryCompetitionMembershipRepository();
  const entries: CompetitionEntryRepository = input.pool
    ? new PostgresCompetitionEntryRepository(input.pool)
    : new InMemoryCompetitionEntryRepository();
  const discovery: CompetitionDiscoveryReader = input.pool
    ? new PostgresCompetitionDiscoveryReader(input.pool)
    : competitions instanceof InMemoryCompetitionRepository &&
        entries instanceof InMemoryCompetitionEntryRepository
      ? new InMemoryCompetitionDiscoveryReader(competitions, entries)
      : new InMemoryCompetitionDiscoveryReader(
          new InMemoryCompetitionRepository(),
          new InMemoryCompetitionEntryRepository(),
        );
  const listDiscoverable = new ListDiscoverableCompetitionsUseCase(discovery);
  const getDiscoverable = new GetDiscoverableCompetitionUseCase(discovery);
  const shared = { clock: { now: () => new Date() }, ids: { generate: () => randomUUID() } };
  return {
    repository: competitions,
    membershipRepository: memberships,
    entryRepository: entries,
    createDraft: new CreateCompetitionDraftUseCase({
      competitions,
      authorization: input.authorization,
      ...shared,
    }),
    updateCover: new UpdateCompetitionCoverUseCase({
      competitions,
      authorization: input.authorization,
      clock: shared.clock,
    }),
    updateDraft: new UpdateCompetitionDraftUseCase({
      competitions,
      entries,
      authorization: input.authorization,
      clock: shared.clock,
    }),
    getDraft: new GetCompetitionDraftUseCase(competitions),
    listByOrganization: new ListOrganizationCompetitionsUseCase(competitions),
    listAccessible: new ListAccessibleCompetitionsUseCase({ competitions, memberships }),
    join: new JoinCompetitionUseCase({ competitions, memberships, clock: shared.clock }),
    changeMembershipRole: new ChangeCompetitionMembershipRoleUseCase({
      authorization: input.authorization,
      competitions,
      memberships,
      organizationMemberships: input.organizationMemberships,
      audit: input.audit,
      transaction: input.transaction,
      roleCapabilities: { permissionsForRole: contextualCompetitionRolePermissions },
      mutationLock: input.mutationLock,
      ...shared,
    }),
    registerTeamEntry: new RegisterTeamEntryUseCase({
      competitions,
      entries,
      authorization: input.authorization,
      ...shared,
    }),
    listParticipants: new ListCompetitionParticipantsUseCase(entries),
    removeParticipant: new RemoveCompetitionParticipantUseCase({
      competitions,
      entries,
      authorization: input.authorization,
    }),
    publish: new PublishCompetitionUseCase({
      competitions,
      entries,
      authorization: input.authorization,
      clock: shared.clock,
    }),
    getDiscoverable,
    applyToCompetition: new ApplyToCompetitionUseCase({ competitions, entries, ...shared }),
    openRegistration: new OpenCompetitionRegistrationUseCase({
      competitions,
      authorization: input.authorization,
      clock: shared.clock,
    }),
    closeRegistration: new CloseCompetitionRegistrationUseCase({
      competitions,
      authorization: input.authorization,
      clock: shared.clock,
    }),
    getTeamEntry: new GetTeamEntryUseCase(entries),
    approveTeamEntry: new ApproveCompetitionEntryUseCase({
      entries,
      competitions,
      authorization: input.authorization,
    }),
    rejectTeamEntry: new RejectCompetitionEntryUseCase({
      entries,
      authorization: input.authorization,
    }),
    explore: new ExploreCompetitionsQuery({
      list: listDiscoverable,
      get: getDiscoverable,
      organizations: input.organizations,
    }),
  };
}

export type CompetitionsModule = ReturnType<typeof createCompetitionsModule>;
