import { randomUUID } from "node:crypto";
import {
  CreateCompetitionDraftUseCase,
  GetCompetitionDraftUseCase,
  GetTeamEntryUseCase,
  JoinCompetitionUseCase,
  RegisterTeamEntryUseCase,
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

export function createCompetitionsModule(input: { readonly pool: Pool | undefined }) {
  const competitions: CompetitionRepository = input.pool
    ? new PostgresCompetitionRepository(input.pool)
    : new InMemoryCompetitionRepository();
  const memberships: CompetitionMembershipRepository = input.pool
    ? new PostgresCompetitionMembershipRepository(input.pool)
    : new InMemoryCompetitionMembershipRepository();
  const entries: CompetitionEntryRepository = input.pool
    ? new PostgresCompetitionEntryRepository(input.pool)
    : new InMemoryCompetitionEntryRepository();
  const shared = { clock: { now: () => new Date() }, ids: { generate: () => randomUUID() } };
  return {
    createDraft: new CreateCompetitionDraftUseCase({ competitions, ...shared }),
    getDraft: new GetCompetitionDraftUseCase(competitions),
    join: new JoinCompetitionUseCase({ competitions, memberships, clock: shared.clock }),
    registerTeamEntry: new RegisterTeamEntryUseCase({
      competitions,
      entries,
      ...shared,
    }),
    getTeamEntry: new GetTeamEntryUseCase(entries),
  };
}

export type CompetitionsModule = ReturnType<typeof createCompetitionsModule>;
