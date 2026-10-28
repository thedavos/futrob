import type { ProviderSyncJob } from "../entities/provider-sync-job.ts";

/** A finished sync is not repeated until this elapses. The minute cron would otherwise reopen it. */
export const PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS = 15 * 60 * 1000;

/** New jobs persisted on one cron tick. The next tick continues the remainder. */
export const PROVIDER_SYNC_DUE_ENQUEUE_LIMIT = 20;

/** Targets inspected per tick so covered clubs do not hide a club that still needs a job. */
export const PROVIDER_SYNC_DUE_SCAN_LIMIT = 240;

export function providerSyncStillCovered(
  job: ProviderSyncJob | null,
  now: Date,
  cooldownMs: number,
): boolean {
  if (job === null) return false;
  switch (job.status) {
    case "queued":
    case "running":
    case "retry_scheduled":
      return true;
    case "succeeded":
    case "dead":
      return now.getTime() - job.completedAt.getTime() < cooldownMs;
    default: {
      const _exhaustive: never = job;
      return _exhaustive;
    }
  }
}
