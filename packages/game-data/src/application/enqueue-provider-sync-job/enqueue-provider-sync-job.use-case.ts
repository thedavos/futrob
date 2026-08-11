import type { ClockPort, IdGeneratorPort } from "@futrob/shared-kernel";
import type { QueuedProviderSyncJob } from "../../domain/entities/provider-sync-job.ts";
import { providerSyncDedupeKey } from "../../domain/entities/provider-sync-job.ts";
import type { GetRecentMatchesInput } from "../../domain/ports/game-data-provider.port.ts";
import type { ProviderSyncJobRepository } from "../../domain/ports/provider-sync-job.repository.ts";
import type { GameDataProviderKey } from "../../domain/value-objects/provider-key.ts";

export interface EnqueueProviderSyncJobInput {
  readonly organizationId: string;
  readonly providerKey: GameDataProviderKey;
  readonly requestId: string;
  readonly sync: GetRecentMatchesInput;
}

export class EnqueueProviderSyncJobUseCase {
  constructor(
    private readonly deps: {
      readonly jobs: ProviderSyncJobRepository;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
      readonly maxAttempts: number;
    },
  ) {}

  execute(input: EnqueueProviderSyncJobInput) {
    const now = this.deps.clock.now();
    const job: QueuedProviderSyncJob = {
      id: this.deps.ids.generate(),
      organizationId: input.organizationId,
      providerKey: input.providerKey,
      kind: "recent-matches",
      sync: input.sync,
      dedupeKey: providerSyncDedupeKey(input),
      requestId: input.requestId,
      status: "queued",
      attempt: 0,
      maxAttempts: this.deps.maxAttempts,
      availableAt: now,
      createdAt: now,
      updatedAt: now,
    };
    return this.deps.jobs.enqueue(job);
  }
}
