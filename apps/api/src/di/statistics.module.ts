import type { Pool } from "pg";
import {
  ProjectApprovedOfficialResultUseCase,
  type PlayerCompetitionStatsRepository,
  type PlayerIdentityResolverPort,
  type PlayerMatchContributionRepository,
  type PlayerPersonalStatsRepository,
} from "@futrob/statistics";
import type { OfficialResultReaderPort } from "@futrob/results";
import type { PlayerGameAccountRepository } from "@futrob/teams";
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
  };
  repositories: {
    contributions: PlayerMatchContributionRepository;
    competitionStats: PlayerCompetitionStatsRepository;
    personalStats: PlayerPersonalStatsRepository;
  };
  ports: {
    identities: PlayerIdentityResolverPort;
  };
};

export function createStatisticsModule(deps: {
  pool: Pool | null;
  resultReader: OfficialResultReaderPort;
  accounts: PlayerGameAccountRepository;
}): StatisticsModule {
  const contributions: PlayerMatchContributionRepository =
    deps.pool === null
      ? new InMemoryPlayerMatchContributionRepository()
      : new PostgresPlayerMatchContributionRepository(deps.pool);
  const competitionStats: PlayerCompetitionStatsRepository =
    deps.pool === null
      ? new InMemoryPlayerCompetitionStatsRepository()
      : new PostgresPlayerCompetitionStatsRepository(deps.pool);
  const personalStats: PlayerPersonalStatsRepository =
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
        clock: new SystemClock(),
      }),
    },
    repositories: {
      contributions,
      competitionStats,
      personalStats,
    },
    ports: {
      identities,
    },
  };
}
