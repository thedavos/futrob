import { randomUUID } from "node:crypto";
import {
  ApproveCompetitionEntryUseCase,
  ChangeCompetitionMembershipRoleUseCase,
  CreateCompetitionDraftUseCase,
  ListOrganizationCompetitionsUseCase,
  GetCompetitionDraftUseCase,
  GetTeamEntryUseCase,
  JoinCompetitionUseCase,
  RegisterTeamEntryUseCase,
  RejectCompetitionEntryUseCase,
  UpdateCompetitionDraftUseCase,
  PublishCompetitionUseCase,
  ListCompetitionParticipantsUseCase,
  ListAccessibleCompetitionsUseCase,
  RemoveCompetitionParticipantUseCase,
  type CompetitionEntryRepository,
  type CompetitionMembershipRepository,
  type CompetitionRepository,
} from "@futrob/competitions";
import type {
  AuthorizationMutationLockPort,
  AuthorizationPort,
  TransactionPort,
} from "@futrob/shared-kernel";
import type { AuthorizationAuditRepository, MembershipRepository } from "@futrob/organizations";
import type { Pool } from "pg";
import {
  InMemoryCompetitionEntryRepository,
  PostgresCompetitionEntryRepository,
} from "@/adapters/competitions/competition-entry.repositories.ts";
import {
  InMemoryCompetitionMembershipRepository,
  InMemoryCompetitionRepository,
} from "@/adapters/competitions/in-memory.repository.ts";
import {
  PostgresCompetitionMembershipRepository,
  PostgresCompetitionRepository,
} from "@/adapters/competitions/postgres.repository.ts";
import { contextualCompetitionRolePermissions } from "@/adapters/authorization/contextual-authorization.adapter.ts";

export function createCompetitionsModule(input: {
  readonly pool: Pool | undefined;
  readonly competitions?: CompetitionRepository;
  readonly authorization: AuthorizationPort;
  readonly organizationMemberships: MembershipRepository;
  readonly audit: AuthorizationAuditRepository;
  readonly transaction: TransactionPort;
  readonly mutationLock: AuthorizationMutationLockPort;
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
    updateDraft: new UpdateCompetitionDraftUseCase({
      competitions,
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
  };
}

export type CompetitionsModule = ReturnType<typeof createCompetitionsModule>;
