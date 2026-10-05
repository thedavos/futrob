import type {
  ProviderSyncJob,
  QueuedProviderSyncJob,
  RunningProviderSyncJob,
} from "../entities/provider-sync-job.ts";
import type { ProviderSyncMatchTarget } from "./provider-sync-completion.port.ts";

export interface ProviderSyncJobRepository {
  enqueue(job: QueuedProviderSyncJob): Promise<ProviderSyncJob>;
  claimNext(input: {
    readonly now: Date;
    readonly leaseToken: string;
    readonly leaseExpiresAt: Date;
    readonly jobId?: string;
  }): Promise<RunningProviderSyncJob | null>;
  findById(id: string): Promise<ProviderSyncJob | null>;
  /** Must commit in the same transaction as the ingested ProviderMatches. */
  recordIngestion(input: {
    readonly id: string;
    readonly leaseToken: string;
    readonly matches: readonly ProviderSyncMatchTarget[];
  }): Promise<boolean>;
  succeed(input: {
    readonly id: string;
    readonly leaseToken: string;
    readonly completedAt: Date;
  }): Promise<boolean>;
  scheduleRetry(input: {
    readonly id: string;
    readonly leaseToken: string;
    readonly availableAt: Date;
    readonly lastErrorCode: string;
  }): Promise<boolean>;
  moveToDead(input: {
    readonly id: string;
    readonly leaseToken: string;
    readonly completedAt: Date;
    readonly lastErrorCode: string;
  }): Promise<boolean>;
}
