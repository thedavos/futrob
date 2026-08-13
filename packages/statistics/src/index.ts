export type {
  PlayerCorrelationStatus,
  PlayerMatchContribution,
} from "./domain/entities/player-match-contribution.ts";
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
export type {
  MatchedPlayerContributionPageQuery,
  MatchedPlayerContributionQuery,
  PlayerMatchContributionRepository,
} from "./domain/ports/player-match-contribution.repository.ts";
export type { PlayerCompetitionStatsRepository } from "./domain/ports/player-competition-stats.repository.ts";
export type { PlayerPersonalStatsRepository } from "./domain/ports/player-personal-stats.repository.ts";
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
export type { CompetitionStatisticsRebuiltEvent } from "./domain/events/competition-statistics-rebuilt.event.ts";
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
export type { OfficialResultReaderPort } from "@futrob/results";
