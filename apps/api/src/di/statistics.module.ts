import type { Pool } from "pg";
import {
  GetMyPersonalStatisticsUseCase,
  ListMyMatchContributionsUseCase,
  ProjectOfficialResultUseCase,
  RebuildCompetitionStatisticsUseCase,
  type PlayerIdentityResolverPort,
  type PlayerProfileLookupPort,
} from "@futrob/statistics";
import type { EncounterReaderPort, OfficialResultReaderPort } from "@futrob/results";
import type {
  CompetitionRosterMembershipRepository,
  PlayerGameAccountRepository,
  PlayerProfileRepository,
} from "@futrob/teams";
import type { AuthorizationPort, EventPublisherPort, TransactionPort } from "@futrob/shared-kernel";
import { SystemClock } from "@/adapters/organizations/crypto-ports";
import { TeamsPlayerIdentityResolver } from "@/adapters/statistics/player-identity-resolver";
import { TeamsPlayerProfileLookup } from "@/adapters/statistics/player-profile-lookup";
import {
  InMemoryPlayerCompetitionStatsRepository,
  InMemoryPlayerMatchContributionRepository,
  InMemoryPlayerPersonalStatsRepository,
} from "@/adapters/statistics/in-memory.repositories";
import {
  PostgresPlayerCompetitionStatsRepository,
  PostgresPlayerMatchContributionRepository,
  PostgresPlayerPersonalStatsRepository,
} from "@/adapters/statistics/postgres.repositories";

export type StatisticsModule = {
  useCases: {
    projectOfficialResult: ProjectOfficialResultUseCase;
    rebuildCompetitionStatistics: RebuildCompetitionStatisticsUseCase;
    getMyPersonalStatistics: GetMyPersonalStatisticsUseCase;
    listMyMatchContributions: ListMyMatchContributionsUseCase;
  };
  ports: {
    identities: PlayerIdentityResolverPort;
    profiles: PlayerProfileLookupPort;
  };
};

export function createStatisticsModule(deps: {
  pool: Pool | null;
  resultReader: OfficialResultReaderPort;
  accounts: PlayerGameAccountRepository;
  rosters: CompetitionRosterMembershipRepository;
  profiles: PlayerProfileRepository;
  authorization: AuthorizationPort;
  encounterReader?: EncounterReaderPort;
  transaction: TransactionPort;
  eventPublisher: EventPublisherPort;
}): StatisticsModule {
  const contributions =
    deps.pool === null
      ? new InMemoryPlayerMatchContributionRepository()
      : new PostgresPlayerMatchContributionRepository(deps.pool);
  const competitionStats =
    deps.pool === null
      ? new InMemoryPlayerCompetitionStatsRepository()
      : new PostgresPlayerCompetitionStatsRepository(deps.pool);
  const personalStats =
    deps.pool === null
      ? new InMemoryPlayerPersonalStatsRepository()
      : new PostgresPlayerPersonalStatsRepository(deps.pool);
  const identities = new TeamsPlayerIdentityResolver(deps.rosters, deps.accounts);
  const profiles = new TeamsPlayerProfileLookup(deps.profiles);
  const projectOfficialResult = new ProjectOfficialResultUseCase({
    officialResults: deps.resultReader,
    encounterReader: deps.encounterReader,
    identities,
    contributions,
    competitionStats,
    personalStats,
    transaction: deps.transaction,
    clock: new SystemClock(),
  });

  return {
    useCases: {
      projectOfficialResult,
      rebuildCompetitionStatistics: new RebuildCompetitionStatisticsUseCase({
        officialResults: deps.resultReader,
        projectOfficialResult,
        contributions,
        competitionStats,
        personalStats,
        eventPublisher: deps.eventPublisher,
        transaction: deps.transaction,
        clock: new SystemClock(),
      }),
      getMyPersonalStatistics: new GetMyPersonalStatisticsUseCase({
        personalStats,
        competitionStats,
        contributions,
        profiles,
        authorization: deps.authorization,
        clock: new SystemClock(),
      }),
      listMyMatchContributions: new ListMyMatchContributionsUseCase({
        contributions,
        profiles,
        authorization: deps.authorization,
      }),
    },
    ports: {
      identities,
      profiles,
    },
  };
}
