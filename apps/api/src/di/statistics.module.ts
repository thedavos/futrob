import type { Pool } from "pg";
import {
  GetMyPersonalStatisticsUseCase,
  ListMyMatchContributionsUseCase,
  ProjectApprovedOfficialResultUseCase,
  type PlayerIdentityResolverPort,
} from "@futrob/statistics";
import type { OfficialResultReaderPort } from "@futrob/results";
import type { PlayerGameAccountRepository } from "@futrob/teams";
import type { TransactionPort } from "@futrob/shared-kernel";
import { SystemClock } from "@/adapters/organizations/crypto-ports";
import { TeamsPlayerIdentityResolver } from "@/adapters/statistics/player-identity-resolver";
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
    projectApprovedOfficialResult: ProjectApprovedOfficialResultUseCase;
    getMyPersonalStatistics: GetMyPersonalStatisticsUseCase;
    listMyMatchContributions: ListMyMatchContributionsUseCase;
  };
  ports: {
    identities: PlayerIdentityResolverPort;
  };
};

export function createStatisticsModule(deps: {
  pool: Pool | null;
  resultReader: OfficialResultReaderPort;
  accounts: PlayerGameAccountRepository;
  transaction: TransactionPort;
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
  const identities = new TeamsPlayerIdentityResolver(deps.accounts);

  return {
    useCases: {
      projectApprovedOfficialResult: new ProjectApprovedOfficialResultUseCase({
        officialResults: deps.resultReader,
        identities,
        contributions,
        competitionStats,
        personalStats,
        transaction: deps.transaction,
        clock: new SystemClock(),
      }),
      getMyPersonalStatistics: new GetMyPersonalStatisticsUseCase(personalStats),
      listMyMatchContributions: new ListMyMatchContributionsUseCase(contributions),
    },
    ports: {
      identities,
    },
  };
}
