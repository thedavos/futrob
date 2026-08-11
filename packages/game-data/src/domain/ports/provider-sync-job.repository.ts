import type {
  ProviderSyncJob,
  QueuedProviderSyncJob,
  RunningProviderSyncJob,
} from "../entities/provider-sync-job.ts";

export interface ProviderSyncJobRepository {
  enqueue(job: QueuedProviderSyncJob): Promise<ProviderSyncJob>;
  claimNext(input: {
    readonly now: Date;
    readonly leaseToken: string;
    readonly leaseExpiresAt: Date;
    readonly jobId?: string;
  }): Promise<RunningProviderSyncJob | null>;
  findById(id: string): Promise<ProviderSyncJob | null>;
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
