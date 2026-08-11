import type { GetRecentMatchesInput } from "../ports/game-data-provider.port.ts";
import type { GameDataProviderKey } from "../value-objects/provider-key.ts";

export interface ProviderSyncJobBase {
  readonly id: string;
  readonly organizationId: string;
  readonly providerKey: GameDataProviderKey;
  readonly kind: "recent-matches";
  readonly sync: GetRecentMatchesInput;
  readonly dedupeKey: string;
  readonly requestId: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface QueuedProviderSyncJob extends ProviderSyncJobBase {
  readonly status: "queued";
  readonly availableAt: Date;
}

export interface RetryScheduledProviderSyncJob extends ProviderSyncJobBase {
  readonly status: "retry_scheduled";
  readonly availableAt: Date;
  readonly lastErrorCode: string;
}

export interface RunningProviderSyncJob extends ProviderSyncJobBase {
  readonly status: "running";
  readonly leaseToken: string;
  readonly leaseExpiresAt: Date;
  readonly startedAt: Date;
}

export interface SucceededProviderSyncJob extends ProviderSyncJobBase {
  readonly status: "succeeded";
  readonly completedAt: Date;
}

export interface DeadProviderSyncJob extends ProviderSyncJobBase {
  readonly status: "dead";
  readonly completedAt: Date;
  readonly lastErrorCode: string;
}

export type ProviderSyncJob =
  | QueuedProviderSyncJob
  | RetryScheduledProviderSyncJob
  | RunningProviderSyncJob
  | SucceededProviderSyncJob
  | DeadProviderSyncJob;

export type ActiveProviderSyncJob =
  | QueuedProviderSyncJob
  | RetryScheduledProviderSyncJob
  | RunningProviderSyncJob;

export function providerSyncDedupeKey(input: {
  readonly providerKey: GameDataProviderKey;
  readonly sync: GetRecentMatchesInput;
}): string {
  const { sync } = input;
  return [
    "recent-matches",
    input.providerKey,
    sync.externalClubId.trim(),
    sync.platform.trim().toLowerCase(),
    sync.gameEdition.trim().toLowerCase(),
    sync.matchType.trim().toLowerCase(),
    String(sync.maxResultCount),
  ].join(":");
}
