import { describe, expect, it } from "vite-plus/test";
import type { ProviderSyncJob, ProviderSyncJobRepository } from "../../index.ts";
import { EnqueueProviderSyncJobUseCase } from "./enqueue-provider-sync-job.use-case.ts";

class MemoryJobs implements ProviderSyncJobRepository {
  readonly jobs: ProviderSyncJob[] = [];

  enqueue(job: ProviderSyncJob): Promise<ProviderSyncJob> {
    const existing = this.jobs.find(
      (candidate) =>
        candidate.organizationId === job.organizationId &&
        candidate.dedupeKey === job.dedupeKey &&
        (candidate.status === "queued" ||
          candidate.status === "running" ||
          candidate.status === "retry_scheduled"),
    );
    if (existing) return Promise.resolve(existing);
    this.jobs.push(job);
    return Promise.resolve(job);
  }

  claimNext(): Promise<null> {
    return Promise.resolve(null);
  }

  findById(): Promise<ProviderSyncJob | null> {
    return Promise.resolve(null);
  }

  succeed(): Promise<boolean> {
    return Promise.resolve(false);
  }

  scheduleRetry(): Promise<boolean> {
    return Promise.resolve(false);
  }

  moveToDead(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

describe("EnqueueProviderSyncJobUseCase", () => {
  it("returns the active job for the same tenant-scoped synchronization", async () => {
    const jobs = new MemoryJobs();
    let nextId = 0;
    const useCase = new EnqueueProviderSyncJobUseCase({
      jobs,
      ids: { generate: () => `job-${++nextId}` },
      clock: { now: () => new Date("2026-08-11T20:00:00.000Z") },
      maxAttempts: 4,
    });
    const input = {
      organizationId: "org-1",
      providerKey: "ea-clubs" as const,
      requestId: "d71ec68c-7f89-4602-8a1f-8cdf0999a0bf",
      sync: {
        externalClubId: "10754",
        platform: "common-gen5",
        gameEdition: "fc26",
        matchType: "friendlyMatch",
        maxResultCount: 10,
      },
    };

    const first = await useCase.execute(input);
    const replay = await useCase.execute(input);

    expect(first.id).toBe("job-1");
    expect(replay.id).toBe(first.id);
    expect(first.dedupeKey).toBe(replay.dedupeKey);
    expect(jobs.jobs).toHaveLength(1);
    expect(nextId).toBe(2);
  });
});
