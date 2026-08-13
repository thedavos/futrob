import type { Pool } from "pg";
import {
  GetCompetitionRankingsUseCase,
  GetCompetitionStandingsUseCase,
  GetCompetitionTeamStatisticsUseCase,
  GetMyPersonalStatisticsUseCase,
  ListMyMatchContributionsUseCase,
  ProjectOfficialResultUseCase,
  RebuildCompetitionRankingsUseCase,
  RebuildCompetitionStatisticsUseCase,
  type PlayerIdentityResolverPort,
  type PlayerProfileLookupPort,
} from "@futrob/statistics";
import type { CompetitionRepository } from "@futrob/competitions";
import type { EncounterReaderPort, OfficialResultReaderPort } from "@futrob/results";
import type {
  CompetitionRosterMembershipRepository,
  PlayerGameAccountRepository,
  PlayerProfileRepository,
} from "@futrob/teams";
import type { AuthorizationPort, EventPublisherPort, TransactionPort } from "@futrob/shared-kernel";
import { SystemClock } from "@/adapters/organizations/crypto-ports";
import { CompetitionsMatchRulesReader } from "@/adapters/statistics/competition-match-rules-reader";
import { TeamsPlayerIdentityResolver } from "@/adapters/statistics/player-identity-resolver";
import { TeamsPlayerProfileLookup } from "@/adapters/statistics/player-profile-lookup";
import {
  InMemoryCompetitionStandingSnapshotRepository,
  InMemoryPlayerCompetitionStatsRepository,
  InMemoryPlayerMatchContributionRepository,
  InMemoryPlayerPersonalStatsRepository,
  InMemoryRankingSnapshotRepository,
  InMemoryTeamCompetitionStatsRepository,
  InMemoryTeamMatchContributionRepository,
} from "@/adapters/statistics/in-memory.repositories";
import {
  PostgresCompetitionStandingSnapshotRepository,
  PostgresPlayerCompetitionStatsRepository,
  PostgresPlayerMatchContributionRepository,
  PostgresPlayerPersonalStatsRepository,
  PostgresRankingSnapshotRepository,
  PostgresTeamCompetitionStatsRepository,
  PostgresTeamMatchContributionRepository,
} from "@/adapters/statistics/postgres.repositories";

export type StatisticsModule = {
  useCases: {
    projectOfficialResult: ProjectOfficialResultUseCase;
    rebuildCompetitionStatistics: RebuildCompetitionStatisticsUseCase;
    rebuildCompetitionRankings: RebuildCompetitionRankingsUseCase;
    getMyPersonalStatistics: GetMyPersonalStatisticsUseCase;
    listMyMatchContributions: ListMyMatchContributionsUseCase;
    getCompetitionStandings: GetCompetitionStandingsUseCase;
    getCompetitionTeamStatistics: GetCompetitionTeamStatisticsUseCase;
    getCompetitionRankings: GetCompetitionRankingsUseCase;
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
  competitions: CompetitionRepository;
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
  const teamContributions =
    deps.pool === null
      ? new InMemoryTeamMatchContributionRepository()
      : new PostgresTeamMatchContributionRepository(deps.pool);
  const teamCompetitionStats =
    deps.pool === null
      ? new InMemoryTeamCompetitionStatsRepository()
      : new PostgresTeamCompetitionStatsRepository(deps.pool);
  const standings =
    deps.pool === null
      ? new InMemoryCompetitionStandingSnapshotRepository()
      : new PostgresCompetitionStandingSnapshotRepository(deps.pool);
  const rankings =
    deps.pool === null
      ? new InMemoryRankingSnapshotRepository()
      : new PostgresRankingSnapshotRepository(deps.pool);
  const matchRules = new CompetitionsMatchRulesReader(deps.competitions);
  const identities = new TeamsPlayerIdentityResolver(deps.rosters, deps.accounts);
  const profiles = new TeamsPlayerProfileLookup(deps.profiles);
  const clock = new SystemClock();
  const rebuildRankings = new RebuildCompetitionRankingsUseCase({
    contributions,
    teamContributions,
    rankings,
    eventPublisher: deps.eventPublisher,
    transaction: deps.transaction,
    clock,
  });
  const projectOfficialResult = new ProjectOfficialResultUseCase({
    officialResults: deps.resultReader,
    encounterReader: deps.encounterReader,
    identities,
    contributions,
    competitionStats,
    personalStats,
    teamContributions,
    teamCompetitionStats,
    standings,
    matchRules,
    rebuildRankings,
    transaction: deps.transaction,
    clock,
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
        teamContributions,
        teamCompetitionStats,
        standings,
        matchRules,
        rebuildRankings,
        eventPublisher: deps.eventPublisher,
        transaction: deps.transaction,
        clock,
      }),
      rebuildCompetitionRankings: rebuildRankings,
      getMyPersonalStatistics: new GetMyPersonalStatisticsUseCase({
        personalStats,
        competitionStats,
        contributions,
        profiles,
        authorization: deps.authorization,
        clock,
      }),
      listMyMatchContributions: new ListMyMatchContributionsUseCase({
        contributions,
        profiles,
        authorization: deps.authorization,
      }),
      getCompetitionStandings: new GetCompetitionStandingsUseCase({
        standings,
        authorization: deps.authorization,
      }),
      getCompetitionTeamStatistics: new GetCompetitionTeamStatisticsUseCase({
        teamCompetitionStats,
        authorization: deps.authorization,
      }),
      getCompetitionRankings: new GetCompetitionRankingsUseCase({
        rankings,
        authorization: deps.authorization,
      }),
    },
    ports: {
      identities,
      profiles,
    },
  };
}
