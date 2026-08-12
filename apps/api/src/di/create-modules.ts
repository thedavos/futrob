import {
  InMemoryProviderMatchRepository,
  InMemoryRawObservationRepository,
} from "@/adapters/game-data/persistence/in-memory.repository.ts";
import {
  PostgresProviderMatchRepository,
  PostgresRawObservationRepository,
} from "@/adapters/game-data/persistence/postgres.repository.ts";
import { InMemoryProviderSyncJobRepository } from "@/adapters/game-data/jobs/in-memory-provider-sync-job.repository.ts";
import { PostgresProviderSyncJobRepository } from "@/adapters/game-data/jobs/postgres-provider-sync-job.repository.ts";
import { CachedGameDataProviderAdapter } from "@/adapters/game-data/resilience/cached-game-data-provider.adapter.ts";
import { InMemoryProviderCircuitBreaker } from "@/adapters/game-data/resilience/provider-circuit-breaker.ts";
import { PostgresProviderCircuitBreaker } from "@/adapters/game-data/resilience/postgres-provider-circuit-breaker.ts";
import {
  InMemoryProviderResponseCache,
  PostgresProviderResponseCache,
} from "@/adapters/game-data/resilience/provider-response-cache.ts";
import {
  InMemoryProviderHealthRepository,
  PostgresProviderHealthRepository,
} from "@/adapters/game-data/health/provider-health.repository.ts";
import { EaClubsGameDataAdapter, ManualGameDataAdapter } from "@/adapters/game-data/internal.ts";
import {
  RepositoryProviderMatchReader,
  SchedulingEncounterReader,
} from "@/adapters/results/bridges.ts";
import { createTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import {
  CompetitionRosterEntryGate,
  DeferredRosterEntryGate,
} from "@/adapters/teams/roster-entry-gate.port.ts";
import { NoopEventPublisher } from "@/adapters/events/noop-event-publisher.ts";
import { InMemoryCompetitionRepository } from "@/adapters/competitions/in-memory.repository.ts";
import { PostgresCompetitionRepository } from "@/adapters/competitions/postgres.repository.ts";
import { CryptoIdGenerator, SystemClock } from "@/adapters/organizations/crypto-ports.ts";
import type { CompetitionId, OrganizationId, TransactionPort } from "@futrob/shared-kernel";
import type { ConfirmOfficialSelectionInput } from "@futrob/results";
import type { Pool } from "pg";
import { createGameDataModule, type GameDataModule } from "./game-data.module.ts";
import { createIdentityModule, type IdentityModule } from "./identity.module.ts";
import { createOrganizationsModule, type OrganizationsModule } from "./organizations.module.ts";
import { createCompetitionsModule, type CompetitionsModule } from "./competitions.module.ts";
import { createTeamsModule, type TeamsModule } from "./teams.module.ts";
import { createAuthorizationModule, type AuthorizationModule } from "./authorization.module.ts";
import { DeferredAuthorizationPort } from "./deferred-authorization.port.ts";
import { createSchedulingModule, type SchedulingModule } from "./scheduling.module.ts";
import { createResultsModule, type ResultsModule } from "./results.module.ts";
import { createStatisticsModule, type StatisticsModule } from "./statistics.module.ts";
import {
  GetTeamRosterManagementUseCase,
  ListTeamRosterManagementUseCase,
} from "@/application/teams/team-roster-management.use-case.ts";

/**
 * Composition root for apps/api — the only place that wires adapters to use
 * cases. Organizations use Postgres when a pool is provided; otherwise memory.
 */
export interface CreateModulesInput {
  readonly fetcher: typeof fetch;
  readonly eaClubsBaseUrl: string;
  readonly pool: Pool | undefined;
}

export function createModules(input: CreateModulesInput): AppModules {
  const ids = new CryptoIdGenerator();
  const clock = new SystemClock();
  const transaction = createTransactionPort(input.pool);
  const providerMatches = input.pool
    ? new PostgresProviderMatchRepository(input.pool)
    : new InMemoryProviderMatchRepository();
  const rawObservations = input.pool
    ? new PostgresRawObservationRepository(input.pool)
    : new InMemoryRawObservationRepository();
  const providerSyncJobs = input.pool
    ? new PostgresProviderSyncJobRepository(input.pool)
    : new InMemoryProviderSyncJobRepository();
  const providerCircuit = input.pool
    ? new PostgresProviderCircuitBreaker(input.pool)
    : new InMemoryProviderCircuitBreaker();
  const providerCache = input.pool
    ? new PostgresProviderResponseCache(input.pool)
    : new InMemoryProviderResponseCache();
  const providerHealth = input.pool
    ? new PostgresProviderHealthRepository(input.pool, providerCircuit, clock)
    : new InMemoryProviderHealthRepository(providerCircuit, clock);
  const eaAdapter = new EaClubsGameDataAdapter({
    fetcher: input.fetcher,
    baseUrl: input.eaClubsBaseUrl,
    timeoutMs: 10_000,
    circuit: providerCircuit,
    clock,
    health: providerHealth,
  });
  const eaProvider = new CachedGameDataProviderAdapter(eaAdapter, {
    cache: providerCache,
    clock,
    ids,
    sleep: (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
    searchTtlMs: 30_000,
    clubTtlMs: 300_000,
    staleMs: 300_000,
  });

  const gameData = createGameDataModule({
    providers: [eaProvider, new ManualGameDataAdapter()],
    ingestion: eaProvider,
    providerMatches,
    rawObservations,
    jobs: providerSyncJobs,
    ids,
    clock,
    maxJobAttempts: 4,
    transaction,
    health: providerHealth,
  });

  const deferredAuthorization = new DeferredAuthorizationPort();
  const entryGate = new DeferredRosterEntryGate();
  const organizations = createOrganizationsModule({
    pool: input.pool,
    authorization: deferredAuthorization,
  });
  const identity = createIdentityModule({
    pool: input.pool,
  });

  const competitionRepository = input.pool
    ? new PostgresCompetitionRepository(input.pool)
    : new InMemoryCompetitionRepository();

  const teams = createTeamsModule({
    pool: input.pool,
    competitions: competitionRepository,
    authorization: deferredAuthorization,
    transaction,
    entryGate,
  });
  const competitions = createCompetitionsModule({
    pool: input.pool,
    competitions: competitionRepository,
    authorization: deferredAuthorization,
    organizationMemberships: organizations.repositories.memberships,
    audit: organizations.repositories.audit,
    transaction,
    mutationLock: organizations.repositories.mutationLock,
  });
  const scheduling = createSchedulingModule({
    pool: input.pool,
    authorization: deferredAuthorization,
    participants: {
      async isApprovedParticipant({ organizationId, competitionId, teamId }) {
        const [team, entry] = await Promise.all([
          teams.repositories.teams.findById(organizationId, teamId),
          competitions.entryRepository.findByCompetitionAndTeam(
            organizationId,
            competitionId,
            teamId,
          ),
        ]);
        return Boolean(team && entry?.status === "approved");
      },
    },
  });
  const authorization = createAuthorizationModule({
    organizations,
    competitions,
    teams,
    transaction,
    scheduling,
  });
  deferredAuthorization.bind(authorization.port);
  entryGate.bind(new CompetitionRosterEntryGate(competitions.entryRepository));

  const teamManagementDeps = {
    authorization: deferredAuthorization,
    entries: {
      list: (organizationId: OrganizationId, competitionId: CompetitionId) =>
        competitions.entryRepository.listByCompetition?.(organizationId, competitionId) ??
        Promise.resolve([]),
      find: competitions.entryRepository.findByCompetitionAndTeam.bind(
        competitions.entryRepository,
      ),
    },
    teams: { find: teams.repositories.teams.findById.bind(teams.repositories.teams) },
    rosters: { list: teams.repositories.rosters.listByTeam.bind(teams.repositories.rosters) },
    rosterStates: {
      get: teams.repositories.rosterStates.get.bind(teams.repositories.rosterStates),
    },
    externalClubs: {
      get: teams.repositories.connections.findByTeam.bind(teams.repositories.connections),
    },
    capacity: teams.repositories.capacity,
    accounts: teams.repositories.accounts,
  };
  const teamManagement = {
    list: new ListTeamRosterManagementUseCase(teamManagementDeps),
    get: new GetTeamRosterManagementUseCase(teamManagementDeps),
  };

  const eventPublisher = new NoopEventPublisher();
  const results = createResultsModule({
    pool: input.pool,
    authorization: deferredAuthorization,
    eventPublisher,
    encounterReader: new SchedulingEncounterReader(
      scheduling.encounters,
      teams.externalClubConnections,
    ),
    providerMatches: new RepositoryProviderMatchReader(
      providerMatches,
      scheduling.encounters,
      teams.externalClubConnections,
    ),
    ids,
  });
  const statistics = createStatisticsModule({
    pool: input.pool ?? null,
    resultReader: results.officialResultReader,
    accounts: teams.repositories.accounts,
    transaction,
  });

  const confirmOfficialSelectionAndProject = {
    async execute(input: ConfirmOfficialSelectionInput) {
      return transaction.runInTransaction(async () => {
        const confirmed = await results.confirmOfficialSelection.execute(input);
        if (!confirmed.isOk()) return confirmed;
        const projected = await statistics.useCases.projectApprovedOfficialResult.execute({
          officialResultId: confirmed.value.id,
        });
        if (!projected.isOk()) throw projected.error;
        return confirmed;
      });
    },
  };

  return {
    authorization,
    competitions,
    confirmOfficialSelectionAndProject,
    gameData,
    identity,
    organizations,
    results,
    scheduling,
    statistics,
    teams,
    teamManagement,
    transaction,
  };
}

export interface AppModules {
  readonly authorization: AuthorizationModule;
  readonly competitions: CompetitionsModule;
  readonly confirmOfficialSelectionAndProject: {
    execute(
      input: ConfirmOfficialSelectionInput,
    ): ReturnType<ResultsModule["confirmOfficialSelection"]["execute"]>;
  };
  readonly gameData: GameDataModule;
  readonly identity: IdentityModule;
  readonly organizations: OrganizationsModule;
  readonly results: ResultsModule;
  readonly scheduling: SchedulingModule;
  readonly statistics: StatisticsModule;
  readonly teams: TeamsModule;
  readonly teamManagement: {
    readonly list: ListTeamRosterManagementUseCase;
    readonly get: GetTeamRosterManagementUseCase;
  };
  readonly transaction: TransactionPort;
}
