import { randomUUID } from "node:crypto";
import {
  AddPlayerGameAccountUseCase,
  AddToRosterUseCase,
  CreateTeamUseCase,
  EnsurePlayerProfileUseCase,
  GetActiveTeamUseCase,
  GetPlayerProfileUseCase,
  GetTeamUseCase,
  ListRostersForPlayerUseCase,
  SetActiveTeamUseCase,
  type ActiveTeamPreferenceRepository,
  type CompetitionRosterMembershipRepository,
  type PlayerGameAccountRepository,
  type PlayerProfileRepository,
  type TeamRepository,
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
import {
  InMemoryActiveTeamPreferenceRepository,
  InMemoryCompetitionRosterMembershipRepository,
  InMemoryTeamRepository,
  PostgresActiveTeamPreferenceRepository,
  PostgresCompetitionRosterMembershipRepository,
  PostgresTeamRepository,
} from "@/adapters/teams/team-roster.repositories.ts";

export function createTeamsModule(input: { readonly pool: Pool | undefined }) {
  let profiles: PlayerProfileRepository;
  let accounts: PlayerGameAccountRepository;
  let teams: TeamRepository;
  let rosters: CompetitionRosterMembershipRepository;
  let preferences: ActiveTeamPreferenceRepository;
  if (input.pool) {
    profiles = new PostgresPlayerProfileRepository(input.pool);
    accounts = new PostgresPlayerGameAccountRepository(input.pool);
    teams = new PostgresTeamRepository(input.pool);
    rosters = new PostgresCompetitionRosterMembershipRepository(input.pool);
    preferences = new PostgresActiveTeamPreferenceRepository(input.pool);
  } else {
    profiles = new InMemoryPlayerProfileRepository();
    accounts = new InMemoryPlayerGameAccountRepository();
    teams = new InMemoryTeamRepository();
    rosters = new InMemoryCompetitionRosterMembershipRepository();
    preferences = new InMemoryActiveTeamPreferenceRepository();
  }
  const shared = { clock: { now: () => new Date() }, ids: { generate: () => randomUUID() } };
  return {
    ensurePlayerProfile: new EnsurePlayerProfileUseCase({ profiles, ...shared }),
    addPlayerGameAccount: new AddPlayerGameAccountUseCase({ accounts, ...shared }),
    getPlayerProfile: new GetPlayerProfileUseCase(profiles, accounts),
    createTeam: new CreateTeamUseCase({ teams, ...shared }),
    getTeam: new GetTeamUseCase(teams),
    addToRoster: new AddToRosterUseCase({ teams, rosters, accounts, ...shared }),
    listRostersForPlayer: new ListRostersForPlayerUseCase(rosters),
    setActiveTeam: new SetActiveTeamUseCase({
      profiles,
      rosters,
      preferences,
      clock: shared.clock,
    }),
    getActiveTeam: new GetActiveTeamUseCase(preferences),
  };
}

export type TeamsModule = ReturnType<typeof createTeamsModule>;
