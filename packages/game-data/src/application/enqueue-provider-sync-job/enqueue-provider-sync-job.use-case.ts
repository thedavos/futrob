import { err, ok, type ClockPort, type IdGeneratorPort, type Result } from "@futrob/shared-kernel";
import type {
  ProviderSyncJob,
  QueuedProviderSyncJob,
} from "../../domain/entities/provider-sync-job.ts";
import { providerSyncDedupeKey } from "../../domain/entities/provider-sync-job.ts";
import type { ProviderSyncQuotaExhausted } from "../../domain/errors/provider-sync-job.errors.ts";
import type { GetRecentMatchesInput } from "../../domain/ports/game-data-provider.port.ts";
import type { ProviderSyncJobRepository } from "../../domain/ports/provider-sync-job.repository.ts";
import type { ProviderSyncQuotaPort } from "../../domain/ports/provider-sync-quota.port.ts";
import type { GameDataProviderKey } from "../../domain/value-objects/provider-key.ts";

export interface EnqueueProviderSyncJobInput {
  readonly organizationId: string;
  readonly providerKey: GameDataProviderKey;
  readonly requestId: string;
  readonly sync: GetRecentMatchesInput;
}

/**
 * Queues one sync per tenant and dedupe key. A deduplicated request returns the active
 * job without touching the quota, so retries and double clicks are never charged twice.
 */
export class EnqueueProviderSyncJobUseCase {
  constructor(
    private readonly deps: {
      readonly jobs: ProviderSyncJobRepository;
      readonly quota: ProviderSyncQuotaPort;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
      readonly maxAttempts: number;
    },
  ) {}

  async execute(
    input: EnqueueProviderSyncJobInput,
  ): Promise<Result<ProviderSyncJob, ProviderSyncQuotaExhausted>> {
    const dedupeKey = providerSyncDedupeKey(input);
    const active = await this.deps.jobs.findActiveByDedupeKey(input.organizationId, dedupeKey);
    if (active) return ok(active);

    const now = this.deps.clock.now();
    const job: QueuedProviderSyncJob = {
      id: this.deps.ids.generate(),
      organizationId: input.organizationId,
      providerKey: input.providerKey,
      kind: "recent-matches",
      sync: input.sync,
      dedupeKey,
      requestId: input.requestId,
      status: "queued",
      attempt: 0,
      maxAttempts: this.deps.maxAttempts,
      availableAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const reserved = await this.deps.quota.reserve({
      organizationId: job.organizationId,
      jobId: job.id,
    });
    if (!reserved.isOk()) return err(reserved.error);

    const stored = await this.deps.jobs.enqueue(job);
    // A concurrent request won the dedupe key between the lookup and the insert.
    if (stored.id !== job.id) {
      await this.deps.quota.release({ organizationId: job.organizationId, jobId: job.id });
    }
    return ok(stored);
  }
}
