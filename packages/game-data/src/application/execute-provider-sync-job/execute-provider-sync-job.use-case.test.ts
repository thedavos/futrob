import { describe, expect, it } from "vite-plus/test";
import { err, ok } from "@futrob/shared-kernel";
import { ProviderHttpFailed, type ProviderSyncJobRepository } from "../../index.ts";
import type {
  ProviderSyncJob,
  RunningProviderSyncJob,
} from "../../domain/entities/provider-sync-job.ts";
import { ExecuteProviderSyncJobUseCase } from "./execute-provider-sync-job.use-case.ts";

class SingleJobRepository implements ProviderSyncJobRepository {
  constructor(public job: ProviderSyncJob) {}

  enqueue(): Promise<ProviderSyncJob> {
    return Promise.resolve(this.job);
  }

  claimNext(input: Parameters<ProviderSyncJobRepository["claimNext"]>[0]) {
    if (this.job.status === "succeeded" || this.job.status === "dead") return Promise.resolve(null);
    const running: RunningProviderSyncJob = {
      ...this.job,
      status: "running",
      attempt: this.job.attempt + 1,
      leaseToken: input.leaseToken,
      leaseExpiresAt: input.leaseExpiresAt,
      startedAt: input.now,
      updatedAt: input.now,
    };
    this.job = running;
    return Promise.resolve(running);
  }

  findById() {
    return Promise.resolve(this.job);
  }

  succeed(input: Parameters<ProviderSyncJobRepository["succeed"]>[0]) {
    if (this.job.status !== "running" || this.job.leaseToken !== input.leaseToken) {
      return Promise.resolve(false);
    }
    this.job = {
      ...this.job,
      status: "succeeded",
      completedAt: input.completedAt,
      updatedAt: input.completedAt,
    };
    return Promise.resolve(true);
  }

  scheduleRetry(input: Parameters<ProviderSyncJobRepository["scheduleRetry"]>[0]) {
    if (this.job.status !== "running") return Promise.resolve(false);
    this.job = {
      ...this.job,
      status: "retry_scheduled",
      availableAt: input.availableAt,
      lastErrorCode: input.lastErrorCode,
      updatedAt: input.availableAt,
    };
    return Promise.resolve(true);
  }

  moveToDead(input: Parameters<ProviderSyncJobRepository["moveToDead"]>[0]) {
    if (this.job.status !== "running") return Promise.resolve(false);
    this.job = {
      ...this.job,
      status: "dead",
      completedAt: input.completedAt,
      lastErrorCode: input.lastErrorCode,
      updatedAt: input.completedAt,
    };
    return Promise.resolve(true);
  }
}

const queued: ProviderSyncJob = {
  id: "job-1",
  organizationId: "org-1",
  providerKey: "ea-clubs",
  kind: "recent-matches",
  sync: {
    externalClubId: "10754",
    platform: "common-gen5",
    gameEdition: "fc26",
    matchType: "friendlyMatch",
    maxResultCount: 10,
  },
  dedupeKey: "dedupe",
  requestId: "de93392a-231a-4870-a964-c1850c92acb1",
  status: "queued",
  attempt: 0,
  maxAttempts: 2,
  availableAt: new Date("2026-08-11T20:00:00.000Z"),
  createdAt: new Date("2026-08-11T20:00:00.000Z"),
  updatedAt: new Date("2026-08-11T20:00:00.000Z"),
};

describe("ExecuteProviderSyncJobUseCase", () => {
  it("does not ingest a succeeded job again when its delivery is replayed", async () => {
    const jobs = new SingleJobRepository(queued);
    let calls = 0;
    let ids = 0;
    const useCase = new ExecuteProviderSyncJobUseCase({
      jobs,
      sync: { execute: async () => ((calls += 1), ok([])) },
      ids: { generate: () => `lease-${++ids}` },
      clock: { now: () => new Date("2026-08-11T20:00:01.000Z") },
      leaseMs: 30_000,
      retryDelayMs: () => 1_000,
    });

    const first = await useCase.execute("job-1");
    const replay = await useCase.execute("job-1");

    expect(first?.status).toBe("succeeded");
    expect(replay?.status).toBe("succeeded");
    expect(calls).toBe(1);
  });

  it("schedules retryable failures and dead-letters them at max attempts", async () => {
    const jobs = new SingleJobRepository(queued);
    const useCase = new ExecuteProviderSyncJobUseCase({
      jobs,
      sync: {
        execute: async () =>
          err(
            new ProviderHttpFailed({
              code: "game_data.ea_clubs_http_error",
              message: "unavailable",
              status: 503,
              path: "/clubs/matches",
            }),
          ),
      },
      ids: { generate: () => "lease" },
      clock: { now: () => new Date("2026-08-11T20:00:01.000Z") },
      leaseMs: 30_000,
      retryDelayMs: () => 1_000,
    });

    const first = await useCase.execute("job-1");
    const second = await useCase.execute("job-1");

    expect(first?.status).toBe("retry_scheduled");
    expect(second?.status).toBe("dead");
  });
});
