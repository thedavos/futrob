export type { ExternalClub } from "./domain/entities/external-club.ts";
export type {
  ProviderMatch,
  ProviderMatchTeam,
  ProviderPlayerMatchStats,
} from "./domain/entities/provider-match.ts";
export type {
  RawProviderObservation,
  ProviderResourceType,
} from "./domain/entities/raw-provider-observation.ts";
export type {
  ProviderSyncJob,
  ActiveProviderSyncJob,
  QueuedProviderSyncJob,
  RetryScheduledProviderSyncJob,
  RunningProviderSyncJob,
  SucceededProviderSyncJob,
  DeadProviderSyncJob,
} from "./domain/entities/provider-sync-job.ts";
export { providerSyncDedupeKey } from "./domain/entities/provider-sync-job.ts";

export type { GameDataProviderKey } from "./domain/value-objects/provider-key.ts";
export { isGameDataProviderKey } from "./domain/value-objects/provider-key.ts";
export type { ExternalReference } from "./domain/value-objects/external-reference.ts";
export { externalReferenceKey } from "./domain/value-objects/external-reference.ts";

export {
  ProviderHttpFailed,
  ProviderTimeout,
  ProviderNetworkError,
  ProviderSchemaError,
  ExternalClubNotFound,
  UnsupportedGameDataOperation,
  ProviderNotImplemented,
  ProviderUnavailable,
  type ProviderTransportError,
  type ProviderError,
} from "./domain/errors/provider.errors.ts";

export type {
  GameDataProviderPort,
  GameDataProviderCapabilities,
  GetExternalClubInput,
  GetRecentMatchesInput,
  SearchExternalClubsInput,
} from "./domain/ports/game-data-provider.port.ts";
export type { GameDataProviderRegistryPort } from "./domain/ports/game-data-provider-registry.port.ts";
export type { ProviderMatchRepository } from "./domain/ports/provider-match.repository.ts";
export type { RawObservationRepository } from "./domain/ports/raw-observation.repository.ts";
export type { ProviderSyncJobRepository } from "./domain/ports/provider-sync-job.repository.ts";
export type {
  ProviderMatchIngestionPort,
  ProviderMatchObservationDraft,
  IngestedProviderMatches,
} from "./domain/ports/provider-match-ingestion.port.ts";
export type { ProviderMatchIngestionRegistryPort } from "./domain/ports/provider-match-ingestion-registry.port.ts";

export {
  ListMatchesBetweenClubsUseCase,
  type ListMatchesBetweenClubsInput,
} from "./application/list-matches-between-clubs/list-matches-between-clubs.use-case.ts";
export { SearchExternalClubsUseCase } from "./application/search-external-clubs/search-external-clubs.use-case.ts";
export { GetExternalClubUseCase } from "./application/get-external-club/get-external-club.use-case.ts";
export { GetRecentProviderMatchesUseCase } from "./application/get-recent-provider-matches/get-recent-provider-matches.use-case.ts";
export { SyncRecentProviderMatchesUseCase } from "./application/sync-recent-provider-matches/sync-recent-provider-matches.use-case.ts";
export {
  EnqueueProviderSyncJobUseCase,
  type EnqueueProviderSyncJobInput,
} from "./application/enqueue-provider-sync-job/enqueue-provider-sync-job.use-case.ts";
export {
  ExecuteProviderSyncJobUseCase,
  isRetryableProviderError,
} from "./application/execute-provider-sync-job/execute-provider-sync-job.use-case.ts";
