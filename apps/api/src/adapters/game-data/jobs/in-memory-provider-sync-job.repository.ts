import type {
  ProviderSyncJob,
  ProviderSyncJobRepository,
  QueuedProviderSyncJob,
  RunningProviderSyncJob,
} from "@futrob/game-data";

const activeStatuses = new Set<ProviderSyncJob["status"]>(["queued", "running", "retry_scheduled"]);

export class InMemoryProviderSyncJobRepository implements ProviderSyncJobRepository {
  private readonly jobs = new Map<string, ProviderSyncJob>();

  enqueue(job: QueuedProviderSyncJob): Promise<ProviderSyncJob> {
    const existing = [...this.jobs.values()].find(
      (candidate) =>
        candidate.organizationId === job.organizationId &&
        candidate.dedupeKey === job.dedupeKey &&
        activeStatuses.has(candidate.status),
    );
    if (existing) return Promise.resolve(existing);
    this.jobs.set(job.id, job);
    return Promise.resolve(job);
  }

  claimNext(input: Parameters<ProviderSyncJobRepository["claimNext"]>[0]) {
    const claimable = [...this.jobs.values()]
      .filter((job) => !input.jobId || job.id === input.jobId)
      .filter(
        (job) =>
          ((job.status === "queued" || job.status === "retry_scheduled") &&
            job.availableAt <= input.now) ||
          (job.status === "running" && job.leaseExpiresAt <= input.now),
      )
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0];
    if (!claimable) return Promise.resolve(null);
    const running: RunningProviderSyncJob = {
      ...claimable,
      status: "running",
      attempt: claimable.attempt + 1,
      leaseToken: input.leaseToken,
      leaseExpiresAt: input.leaseExpiresAt,
      startedAt: input.now,
      updatedAt: input.now,
    };
    this.jobs.set(running.id, running);
    return Promise.resolve(running);
  }

  findById(id: string): Promise<ProviderSyncJob | null> {
    return Promise.resolve(this.jobs.get(id) ?? null);
  }

  succeed(input: Parameters<ProviderSyncJobRepository["succeed"]>[0]) {
    const running = this.runningWithLease(input.id, input.leaseToken);
    if (!running) return Promise.resolve(false);
    this.jobs.set(input.id, {
      ...running,
      status: "succeeded",
      completedAt: input.completedAt,
      updatedAt: input.completedAt,
    });
    return Promise.resolve(true);
  }

  scheduleRetry(input: Parameters<ProviderSyncJobRepository["scheduleRetry"]>[0]) {
    const running = this.runningWithLease(input.id, input.leaseToken);
    if (!running) return Promise.resolve(false);
    this.jobs.set(input.id, {
      ...running,
      status: "retry_scheduled",
      availableAt: input.availableAt,
      lastErrorCode: input.lastErrorCode,
      updatedAt: input.availableAt,
    });
    return Promise.resolve(true);
  }

  moveToDead(input: Parameters<ProviderSyncJobRepository["moveToDead"]>[0]) {
    const running = this.runningWithLease(input.id, input.leaseToken);
    if (!running) return Promise.resolve(false);
    this.jobs.set(input.id, {
      ...running,
      status: "dead",
      completedAt: input.completedAt,
      lastErrorCode: input.lastErrorCode,
      updatedAt: input.completedAt,
    });
    return Promise.resolve(true);
  }

  private runningWithLease(id: string, leaseToken: string): RunningProviderSyncJob | null {
    const job = this.jobs.get(id);
    return job?.status === "running" && job.leaseToken === leaseToken ? job : null;
  }
}
