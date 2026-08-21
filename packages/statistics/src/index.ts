export type {
  PlayerCorrelationStatus,
  PlayerMatchContribution,
} from "./domain/entities/player-match-contribution.ts";
export type {
  TeamCorrelationStatus,
  TeamMatchContribution,
  TeamMatchSide,
} from "./domain/entities/team-match-contribution.ts";
export {
  PLAYER_STATISTIC_METRICS,
  type PlayerAggregateStats,
  type PlayerStatisticMetric,
  type PlayerStatisticPartialFlags,
  type PlayerStatisticRates,
  type PlayerStatisticTotals,
} from "./domain/entities/player-aggregate-stats.ts";
export type { PlayerCompetitionStats } from "./domain/entities/player-competition-stats.ts";
export type { PlayerPersonalStats } from "./domain/entities/player-personal-stats.ts";
export type { TeamAggregateStats } from "./domain/entities/team-aggregate-stats.ts";
export type { TeamCompetitionStats } from "./domain/entities/team-competition-stats.ts";
export {
  COMPETITION_STANDING_FORMULA_VERSION,
  type CompetitionStandingRow,
  type CompetitionStandingSnapshot,
} from "./domain/entities/competition-standing-snapshot.ts";
export {
  DEFAULT_RANKING_ELIGIBILITY,
  RANKING_FORMULA_VERSION,
  RANKING_KINDS,
  type RankingEligibilityConfig,
  type RankingKind,
  type RankingRow,
  type RankingSnapshot,
} from "./domain/entities/ranking-snapshot.ts";
export type {
  MatchedPlayerContributionPageQuery,
  MatchedPlayerContributionQuery,
  PlayerMatchContributionRepository,
} from "./domain/ports/player-match-contribution.repository.ts";
export type { PlayerCompetitionStatsRepository } from "./domain/ports/player-competition-stats.repository.ts";
export type { PlayerPersonalStatsRepository } from "./domain/ports/player-personal-stats.repository.ts";
export type { TeamMatchContributionRepository } from "./domain/ports/team-match-contribution.repository.ts";
export type { TeamCompetitionStatsRepository } from "./domain/ports/team-competition-stats.repository.ts";
export type { CompetitionStandingSnapshotRepository } from "./domain/ports/competition-standing-snapshot.repository.ts";
export type { RankingSnapshotRepository } from "./domain/ports/ranking-snapshot.repository.ts";
export type {
  CompetitionMatchPointsRules,
  CompetitionMatchRulesReaderPort,
  StandingResolutionMode,
} from "./domain/ports/competition-match-rules-reader.port.ts";
export type { PlayerProfileLookupPort } from "./domain/ports/player-profile-lookup.port.ts";
export type {
  PlayerIdentityResolution,
  PlayerIdentityResolverPort,
} from "./domain/ports/player-identity-resolver.port.ts";
export {
  OfficialResultNotFound,
  type ProjectOfficialResultError,
} from "./domain/errors/project-official-result.errors.ts";
export { StatisticsAuthorizationForbidden } from "./domain/errors/statistics.errors.ts";
export {
  STATISTICS_PERMISSION,
  STATISTICS_PERMISSIONS,
} from "./domain/policies/statistics-permissions.ts";
export {
  ProjectOfficialResultUseCase,
  type ProjectOfficialResultDependencies,
  type ProjectOfficialResultInput,
  type ProjectOfficialResultOutput,
} from "./application/project-official-result/project-official-result.use-case.ts";
export {
  RebuildCompetitionStatisticsUseCase,
  type RebuildCompetitionStatisticsDependencies,
  type RebuildCompetitionStatisticsInput,
  type RebuildCompetitionStatisticsOutput,
} from "./application/rebuild-competition-statistics/rebuild-competition-statistics.use-case.ts";
export {
  RebuildCompetitionRankingsUseCase,
  type RebuildCompetitionRankingsDependencies,
  type RebuildCompetitionRankingsInput,
  type RebuildCompetitionRankingsOutput,
} from "./application/rebuild-competition-rankings/rebuild-competition-rankings.use-case.ts";
export type { CompetitionStatisticsRebuiltEvent } from "./domain/events/competition-statistics-rebuilt.event.ts";
export type { RankingsUpdatedEvent } from "./domain/events/rankings-updated.event.ts";
export {
  GetMyPersonalStatisticsUseCase,
  type GetMyPersonalStatisticsDependencies,
  type GetMyPersonalStatisticsInput,
} from "./application/get-my-personal-statistics/get-my-personal-statistics.use-case.ts";
export {
  ListMyMatchContributionsUseCase,
  type ListMyMatchContributionsDependencies,
  type ListMyMatchContributionsInput,
  type ListMyMatchContributionsOutput,
} from "./application/list-my-match-contributions/list-my-match-contributions.use-case.ts";
export {
  GetCompetitionStandingsUseCase,
  type GetCompetitionStandingsDependencies,
  type GetCompetitionStandingsInput,
} from "./application/get-competition-standings/get-competition-standings.use-case.ts";
export {
  GetCompetitionTeamStatisticsUseCase,
  type GetCompetitionTeamStatisticsDependencies,
  type GetCompetitionTeamStatisticsInput,
} from "./application/get-competition-team-statistics/get-competition-team-statistics.use-case.ts";
export {
  GetCompetitionRankingsUseCase,
  type GetCompetitionRankingsDependencies,
  type GetCompetitionRankingsInput,
} from "./application/get-competition-rankings/get-competition-rankings.use-case.ts";
export type { OfficialResultReaderPort } from "@futrob/results";
