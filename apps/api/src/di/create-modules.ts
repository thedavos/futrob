import {
  InMemoryProviderMatchRepository,
  InMemoryRawObservationRepository,
} from "@/adapters/game-data/persistence/in-memory.repository.ts";
import {
  PostgresProviderMatchRepository,
  PostgresRawObservationRepository,
} from "@/adapters/game-data/persistence/postgres.repository.ts";
import { EaClubsGameDataAdapter, ManualGameDataAdapter } from "@/adapters/game-data/internal.ts";
import {
  RepositoryProviderMatchReader,
  SchedulingEncounterReader,
} from "@/adapters/results/bridges.ts";
import { createTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import { InMemoryCompetitionRepository } from "@/adapters/competitions/in-memory.repository.ts";
import { PostgresCompetitionRepository } from "@/adapters/competitions/postgres.repository.ts";
import { CryptoIdGenerator } from "@/adapters/organizations/crypto-ports.ts";
import type { DomainEvent, EventPublisherPort, TransactionPort } from "@futrob/shared-kernel";
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

class ProjectingEventPublisher implements EventPublisherPort {
  private project: ((officialResultId: string) => Promise<void>) | null = null;

  bind(project: (officialResultId: string) => Promise<void>) {
    this.project = project;
  }

  async publish(event: DomainEvent): Promise<void> {
    const payload = event.payload as Record<string, unknown>;
    if (
      event.eventName === "results.official-result-approved" &&
      typeof payload.officialResultId === "string" &&
      this.project
    ) {
      await this.project(payload.officialResultId);
    }
  }

  async publishMany(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}

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
  const providerMatches = input.pool
    ? new PostgresProviderMatchRepository(input.pool)
    : new InMemoryProviderMatchRepository();
  const rawObservations = input.pool
    ? new PostgresRawObservationRepository(input.pool)
    : new InMemoryRawObservationRepository();
  const eaProvider = new EaClubsGameDataAdapter({
    fetcher: input.fetcher,
    baseUrl: input.eaClubsBaseUrl,
    timeoutMs: 10_000,
  });

  const gameData = createGameDataModule({
    providers: [eaProvider, new ManualGameDataAdapter()],
    ingestion: eaProvider,
    providerMatches,
    rawObservations,
    ids,
  });

  const deferredAuthorization = new DeferredAuthorizationPort();
  const transaction = createTransactionPort(input.pool);
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

  const eventPublisher = new ProjectingEventPublisher();
  const results = createResultsModule({
    pool: input.pool,
    authorization: deferredAuthorization,
    eventPublisher,
    encounterReader: new SchedulingEncounterReader(scheduling.encounters),
    providerMatches: new RepositoryProviderMatchReader(providerMatches, scheduling.encounters),
    ids,
  });
  const statistics = createStatisticsModule({
    pool: input.pool ?? null,
    officialResults: results.results,
    accounts: teams.repositories.accounts,
  });
  eventPublisher.bind(async (officialResultId) => {
    const projected = await statistics.projectOfficialResultFromEvent({ officialResultId });
    if (!projected.isOk()) throw projected.error;
  });

  return {
    authorization,
    competitions,
    gameData,
    identity,
    organizations,
    results,
    scheduling,
    statistics,
    teams,
    transaction,
  };
}

export interface AppModules {
  readonly authorization: AuthorizationModule;
  readonly competitions: CompetitionsModule;
  readonly gameData: GameDataModule;
  readonly identity: IdentityModule;
  readonly organizations: OrganizationsModule;
  readonly results: ResultsModule;
  readonly scheduling: SchedulingModule;
  readonly statistics: StatisticsModule;
  readonly teams: TeamsModule;
  readonly transaction: TransactionPort;
}
