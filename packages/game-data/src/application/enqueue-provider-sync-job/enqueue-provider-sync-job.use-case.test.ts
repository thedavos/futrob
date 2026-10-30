import { err, ok } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type {
  ProviderSyncJob,
  ProviderSyncJobRepository,
  ProviderSyncQuotaPort,
} from "../../index.ts";
import { ProviderSyncQuotaExhausted } from "../../domain/errors/provider-sync-job.errors.ts";
import { EnqueueProviderSyncJobUseCase } from "./enqueue-provider-sync-job.use-case.ts";

const isActive = (job: ProviderSyncJob) =>
  job.status === "queued" || job.status === "running" || job.status === "retry_scheduled";

class MemoryJobs implements ProviderSyncJobRepository {
  readonly jobs: ProviderSyncJob[] = [];
  /** Simulates a concurrent request storing the same dedupe key after the lookup. */
  raceWinner: ProviderSyncJob | null = null;
  failNextInsert = false;

  findActiveByDedupeKey(organizationId: string, dedupeKey: string) {
    return Promise.resolve(
      this.jobs.find(
        (job) =>
          job.organizationId === organizationId && job.dedupeKey === dedupeKey && isActive(job),
      ) ?? null,
    );
  }

  async enqueue(job: ProviderSyncJob): Promise<ProviderSyncJob> {
    if (this.failNextInsert) {
      this.failNextInsert = false;
      throw new Error("simulated INSERT failure");
    }
    if (this.raceWinner) {
      this.jobs.push(this.raceWinner);
      this.raceWinner = null;
    }
    const existing = await this.findActiveByDedupeKey(job.organizationId, job.dedupeKey);
    if (existing) return existing;
    this.jobs.push(job);
    return job;
  }

  claimNext(): Promise<null> {
    return Promise.resolve(null);
  }

  findById(): Promise<ProviderSyncJob | null> {
    return Promise.resolve(null);
  }

  findLatest(): Promise<ProviderSyncJob | null> {
    return Promise.resolve(null);
  }

  succeed(): Promise<boolean> {
    return Promise.resolve(false);
  }

  recordIngestion(): Promise<boolean> {
    return Promise.resolve(false);
  }

  scheduleRetry(): Promise<boolean> {
    return Promise.resolve(false);
  }

  moveToDead(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

function quotaOf(limit: number) {
  const reserved = new Set<string>();
  const quota: ProviderSyncQuotaPort & { readonly reserved: Set<string> } = {
    reserved,
    async reserve({ jobId }) {
      if (reserved.has(jobId)) return ok(undefined);
      if (reserved.size >= limit) {
        return err(
          new ProviderSyncQuotaExhausted({
            code: "game_data.sync_quota_exhausted",
            message: "Monthly sync quota used",
            limit,
            used: reserved.size,
            resetsAt: new Date("2026-09-01T00:00:00.000Z"),
          }),
        );
      }
      reserved.add(jobId);
      return ok(undefined);
    },
    async release({ jobId }) {
      reserved.delete(jobId);
    },
  };
  return quota;
}

function setup(limit = 60) {
  const jobs = new MemoryJobs();
  const quota = quotaOf(limit);
  let nextId = 0;
  const useCase = new EnqueueProviderSyncJobUseCase({
    transaction: { runInTransaction: (operation) => operation() },
    jobs,
    quota,
    ids: { generate: () => `job-${++nextId}` },
    clock: { now: () => new Date("2026-08-11T20:00:00.000Z") },
    maxAttempts: 4,
  });
  return { jobs, quota, useCase };
}

const input = (externalClubId = "10754") => ({
  organizationId: "org-1",
  providerKey: "ea-clubs" as const,
  requestId: "d71ec68c-7f89-4602-8a1f-8cdf0999a0bf",
  sync: {
    externalClubId,
    platform: "common-gen5",
    gameEdition: "fc26",
    matchType: "friendlyMatch",
    maxResultCount: 10,
  },
});

describe("EnqueueProviderSyncJobUseCase", () => {
  it("returns the active job for the same tenant-scoped synchronization without consuming quota", async () => {
    const { jobs, quota, useCase } = setup();

    const first = await useCase.execute(input());
    const replay = await useCase.execute(input());

    expect(first.isOk() && first.value.id).toBe("job-1");
    expect(replay.isOk() && replay.value.id).toBe("job-1");
    expect(jobs.jobs).toHaveLength(1);
    expect([...quota.reserved]).toEqual(["job-1"]);
  });

  it("refuses a new job once the quota is used, but still returns an active duplicate", async () => {
    const { jobs, useCase } = setup(1);
    await useCase.execute(input("club-a"));

    const rejected = await useCase.execute(input("club-b"));
    const duplicate = await useCase.execute(input("club-a"));

    expect(!rejected.isOk() && rejected.error).toMatchObject({
      code: "game_data.sync_quota_exhausted",
      limit: 1,
      used: 1,
    });
    expect(duplicate.isOk() && duplicate.value.id).toBe("job-1");
    expect(jobs.jobs).toHaveLength(1);
  });

  it("releases the reservation when a concurrent request wins the dedupe key", async () => {
    const { jobs, quota, useCase } = setup();
    const winner = await setup().useCase.execute(input());
    if (!winner.isOk()) throw winner.error;
    jobs.raceWinner = { ...winner.value, id: "job-winner" };

    const result = await useCase.execute(input());

    expect(result.isOk() && result.value.id).toBe("job-winner");
    expect(quota.reserved.size).toBe(0);
  });
});

it("releases quota after a failed insert so the last unit remains available on retry", async () => {
  const { jobs, quota, useCase } = setup(1);
  jobs.failNextInsert = true;
  await expect(useCase.execute(input())).rejects.toThrow("simulated INSERT failure");
  expect(jobs.jobs).toHaveLength(0);
  expect(quota.reserved.size).toBe(0);
  const retry = await useCase.execute(input());
  expect(retry.isOk()).toBe(true);
  expect(jobs.jobs).toHaveLength(1);
  expect(quota.reserved.size).toBe(1);
});
