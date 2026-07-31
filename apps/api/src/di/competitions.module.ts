import { randomUUID } from "node:crypto";
import {
  CreateCompetitionDraftUseCase,
  GetCompetitionDraftUseCase,
  JoinCompetitionUseCase,
  type CompetitionMembershipRepository,
  type CompetitionRepository,
} from "@futrob/competitions";
import type { Pool } from "pg";
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
  const shared = { clock: { now: () => new Date() }, ids: { generate: () => randomUUID() } };
  return {
    createDraft: new CreateCompetitionDraftUseCase({ competitions, ...shared }),
    getDraft: new GetCompetitionDraftUseCase(competitions),
    join: new JoinCompetitionUseCase({ competitions, memberships, clock: shared.clock }),
  };
}

export type CompetitionsModule = ReturnType<typeof createCompetitionsModule>;
