import { randomUUID } from "node:crypto";
import {
  AddPlayerGameAccountUseCase,
  EnsurePlayerProfileUseCase,
  GetPlayerProfileUseCase,
  type PlayerGameAccountRepository,
  type PlayerProfileRepository,
} from "@futrob/teams";
import type { Pool } from "pg";
import {
  InMemoryPlayerGameAccountRepository,
  InMemoryPlayerProfileRepository,
} from "@/adapters/teams/in-memory.repository.ts";
import {
  PostgresPlayerGameAccountRepository,
  PostgresPlayerProfileRepository,
} from "@/adapters/teams/postgres.repository.ts";

export function createTeamsModule(input: { readonly pool: Pool | undefined }) {
  let profiles: PlayerProfileRepository;
  let accounts: PlayerGameAccountRepository;
  if (input.pool) {
    profiles = new PostgresPlayerProfileRepository(input.pool);
    accounts = new PostgresPlayerGameAccountRepository(input.pool);
  } else {
    profiles = new InMemoryPlayerProfileRepository();
    accounts = new InMemoryPlayerGameAccountRepository();
  }
  const shared = { clock: { now: () => new Date() }, ids: { generate: () => randomUUID() } };
  return {
    ensurePlayerProfile: new EnsurePlayerProfileUseCase({ profiles, ...shared }),
    addPlayerGameAccount: new AddPlayerGameAccountUseCase({ accounts, ...shared }),
    getPlayerProfile: new GetPlayerProfileUseCase(profiles, accounts),
  };
}

export type TeamsModule = ReturnType<typeof createTeamsModule>;
