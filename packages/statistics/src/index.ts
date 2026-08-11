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
export type { PlayerMatchContributionRepository } from "./domain/ports/player-match-contribution.repository.ts";
export type { PlayerCompetitionStatsRepository } from "./domain/ports/player-competition-stats.repository.ts";
export type { PlayerPersonalStatsRepository } from "./domain/ports/player-personal-stats.repository.ts";
export type {
  PlayerIdentityResolution,
  PlayerIdentityResolverPort,
} from "./domain/ports/player-identity-resolver.port.ts";
export {
  OfficialResultNotApproved,
  OfficialResultNotFound,
  type ProjectApprovedOfficialResultError,
} from "./domain/errors/project-official-result.errors.ts";
export {
  ProjectApprovedOfficialResultUseCase,
  type ProjectApprovedOfficialResultDependencies,
  type ProjectApprovedOfficialResultInput,
  type ProjectApprovedOfficialResultOutput,
} from "./application/project-approved-official-result/project-approved-official-result.use-case.ts";
export { GetMyPersonalStatisticsUseCase } from "./application/get-my-personal-statistics/get-my-personal-statistics.use-case.ts";
export {
  ListMyMatchContributionsUseCase,
  type ListMyMatchContributionsInput,
  type ListMyMatchContributionsOutput,
} from "./application/list-my-match-contributions/list-my-match-contributions.use-case.ts";
export type { OfficialResultReaderPort } from "@futrob/results";
