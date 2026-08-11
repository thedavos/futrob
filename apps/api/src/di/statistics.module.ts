import type { Pool } from "pg";
import {
  ProjectApprovedOfficialResultUseCase,
  type PlayerCompetitionStatsRepository,
  type PlayerIdentityResolverPort,
  type PlayerMatchContributionRepository,
  type PlayerPersonalStatsRepository,
} from "@futrob/statistics";
import type { OfficialResultApprovedEvent, OfficialResultRepository } from "@futrob/results";
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
import { RepositoryOfficialResultReader } from "@/adapters/statistics/official-result-reader";

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
  projectOfficialResultFromEvent(
    payload: Pick<OfficialResultApprovedEvent["payload"], "officialResultId">,
  ): ReturnType<ProjectApprovedOfficialResultUseCase["execute"]>;
};

export function createStatisticsModule(deps: {
  pool: Pool | null;
  officialResults: OfficialResultRepository;
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
  const projectApprovedOfficialResult = new ProjectApprovedOfficialResultUseCase({
    officialResults: new RepositoryOfficialResultReader(deps.officialResults),
    identities,
    contributions,
    competitionStats,
    personalStats,
    clock: new SystemClock(),
  });

  return {
    useCases: {
      projectApprovedOfficialResult,
    },
    repositories: {
      contributions,
      competitionStats,
      personalStats,
    },
    ports: {
      identities,
    },
    projectOfficialResultFromEvent(payload) {
      return projectApprovedOfficialResult.execute({
        officialResultId: payload.officialResultId,
      });
    },
  };
}
