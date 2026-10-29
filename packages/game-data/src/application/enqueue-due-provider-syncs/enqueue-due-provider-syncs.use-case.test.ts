import { describe, expect, it } from "vite-plus/test";
import type { ProviderSyncJob, ProviderSyncJobRepository } from "../../index.ts";
import type { DueProviderSyncTarget } from "../../domain/ports/due-provider-sync-target.feed.ts";
import { providerSyncDedupeKey } from "../../domain/entities/provider-sync-job.ts";
import { PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS } from "../../domain/policies/provider-sync-enqueue-coverage.ts";
import { EnqueueProviderSyncJobUseCase } from "../enqueue-provider-sync-job/enqueue-provider-sync-job.use-case.ts";
import { EnqueueDueProviderSyncsUseCase } from "./enqueue-due-provider-syncs.use-case.ts";

const now = new Date("2026-10-10T20:00:00.000Z");

function target(matchType: string, externalClubId = "10754"): DueProviderSyncTarget {
  return {
    organizationId: "org-1",
    providerKey: "ea-clubs",
    externalClubId,
    platform: "common-gen5",
    gameEdition: "fc26",
    matchType,
    maxResultCount: 50,
  };
}

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

  findById(): Promise<null> {
    return Promise.resolve(null);
  }

  findLatest(input: {
    readonly organizationId: string;
    readonly dedupeKey: string;
  }): Promise<ProviderSyncJob | null> {
    const matches = this.jobs.filter(
      (job) => job.organizationId === input.organizationId && job.dedupeKey === input.dedupeKey,
    );
    return Promise.resolve(matches.at(-1) ?? null);
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

function harness(targets: readonly DueProviderSyncTarget[], maxEnqueues = 20) {
  const jobs = new MemoryJobs();
  let nextId = 0;
  const ids = { generate: () => `id-${++nextId}` };
  const clock = { now: () => now };
  const enqueue = new EnqueueProviderSyncJobUseCase({ jobs, ids, clock, maxAttempts: 4 });
  const useCase = new EnqueueDueProviderSyncsUseCase({
    targets: { list: () => Promise.resolve(targets) },
    jobs,
    enqueue,
    ids,
    clock,
    maxEnqueues,
  });
  return { jobs, useCase };
}

describe("EnqueueDueProviderSyncsUseCase", () => {
  it("persists one job per target and repeats as already covered", async () => {
    const { jobs, useCase } = harness([target("leagueMatch"), target("friendlyMatch")]);

    const first = await useCase.execute();
    const second = await useCase.execute();

    expect(first).toMatchObject({ enqueued: 2, alreadyCovered: 0, deferred: 0 });
    expect(first.jobs).toHaveLength(2);
    expect(new Set(first.jobs.map((job) => job.id)).size).toBe(2);
    expect(second).toMatchObject({ enqueued: 0, alreadyCovered: 2, deferred: 0, jobs: [] });
    expect(jobs.jobs).toHaveLength(2);
  });

  it("skips a success inside the cooldown and enqueues again once it elapses", async () => {
    const club = target("leagueMatch");
    const { jobs, useCase } = harness([club]);
    const succeededAt = new Date(now.getTime() - 60_000);
    jobs.jobs.push({
      id: "job-old",
      organizationId: club.organizationId,
      providerKey: club.providerKey,
      kind: "recent-matches",
      sync: club,
      dedupeKey: providerSyncDedupeKey({ providerKey: club.providerKey, sync: club }),
      requestId: "request-old",
      status: "succeeded",
      attempt: 1,
      maxAttempts: 4,
      createdAt: succeededAt,
      updatedAt: succeededAt,
      completedAt: succeededAt,
    });

    const covered = await useCase.execute();
    expect(covered).toMatchObject({ enqueued: 0, alreadyCovered: 1, jobs: [] });

    jobs.jobs[0] = {
      ...(jobs.jobs[0] as Extract<ProviderSyncJob, { status: "succeeded" }>),
      completedAt: new Date(now.getTime() - PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS),
    };
    const again = await useCase.execute();
    expect(again.enqueued).toBe(1);
    expect(jobs.jobs).toHaveLength(2);
  });

  it("stops at the tick cap and leaves the rest deferred", async () => {
    const { useCase } = harness(
      [
        target("leagueMatch", "club-a"),
        target("leagueMatch", "club-b"),
        target("leagueMatch", "club-c"),
      ],
      1,
    );

    const result = await useCase.execute();

    expect(result.enqueued).toBe(1);
    expect(result.deferred).toBe(2);
    expect(result.jobs[0]?.requestId).toBeTruthy();
  });
});
