import { describe, expect, it } from "vite-plus/test";
import type { QueuedProviderSyncJob } from "@futrob/game-data";
import { InMemoryProviderSyncJobRepository } from "./in-memory-provider-sync-job.repository.ts";

const job: QueuedProviderSyncJob = {
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
  dedupeKey: "recent-matches:ea-clubs:10754",
  requestId: "d46e442d-4509-40c8-aeda-b7dc52383b71",
  status: "queued",
  attempt: 0,
  maxAttempts: 4,
  availableAt: new Date("2026-08-11T20:00:00.000Z"),
  createdAt: new Date("2026-08-11T20:00:00.000Z"),
  updatedAt: new Date("2026-08-11T20:00:00.000Z"),
};

describe("InMemoryProviderSyncJobRepository", () => {
  it("deduplicates within an organization but not across organizations", async () => {
    const repository = new InMemoryProviderSyncJobRepository();

    const first = await repository.enqueue(job);
    const replay = await repository.enqueue({ ...job, id: "job-2" });
    const otherTenant = await repository.enqueue({
      ...job,
      id: "job-3",
      organizationId: "org-2",
    });

    expect(replay.id).toBe(first.id);
    expect(otherTenant.id).toBe("job-3");
  });

  it("leases an attempt to only one concurrent claimant", async () => {
    const repository = new InMemoryProviderSyncJobRepository();
    await repository.enqueue(job);
    const now = new Date("2026-08-11T20:00:01.000Z");

    const claims = await Promise.all([
      repository.claimNext({
        now,
        jobId: job.id,
        leaseToken: "lease-a",
        leaseExpiresAt: new Date("2026-08-11T20:01:01.000Z"),
      }),
      repository.claimNext({
        now,
        jobId: job.id,
        leaseToken: "lease-b",
        leaseExpiresAt: new Date("2026-08-11T20:01:01.000Z"),
      }),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);
  });
});
