import { randomUUID } from "node:crypto";
import {
  ApproveCompetitionEntryUseCase,
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
  RemoveCompetitionParticipantUseCase,
  type CompetitionEntryRepository,
  type CompetitionMembershipRepository,
  type CompetitionRepository,
} from "@futrob/competitions";
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

export function createCompetitionsModule(input: {
  readonly pool: Pool | undefined;
  readonly competitions?: CompetitionRepository;
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
    createDraft: new CreateCompetitionDraftUseCase({ competitions, ...shared }),
    updateDraft: new UpdateCompetitionDraftUseCase({ competitions, clock: shared.clock }),
    getDraft: new GetCompetitionDraftUseCase(competitions),
    listByOrganization: new ListOrganizationCompetitionsUseCase(competitions),
    join: new JoinCompetitionUseCase({ competitions, memberships, clock: shared.clock }),
    registerTeamEntry: new RegisterTeamEntryUseCase({
      competitions,
      entries,
      ...shared,
    }),
    listParticipants: new ListCompetitionParticipantsUseCase(entries),
    removeParticipant: new RemoveCompetitionParticipantUseCase({ competitions, entries }),
    publish: new PublishCompetitionUseCase({ competitions, entries, clock: shared.clock }),
    getTeamEntry: new GetTeamEntryUseCase(entries),
    approveTeamEntry: new ApproveCompetitionEntryUseCase({
      entries,
      competitions,
    }),
    rejectTeamEntry: new RejectCompetitionEntryUseCase(entries),
  };
}

export type CompetitionsModule = ReturnType<typeof createCompetitionsModule>;
