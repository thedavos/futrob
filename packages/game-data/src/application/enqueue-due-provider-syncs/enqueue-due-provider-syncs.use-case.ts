import type { IdGeneratorPort, ClockPort } from "@futrob/shared-kernel";
import { providerSyncDedupeKey } from "../../domain/entities/provider-sync-job.ts";
import type { DueProviderSyncTargetFeed } from "../../domain/ports/due-provider-sync-target.feed.ts";
import type { ProviderSyncJobRepository } from "../../domain/ports/provider-sync-job.repository.ts";
import {
  PROVIDER_SYNC_DUE_ENQUEUE_LIMIT,
  PROVIDER_SYNC_DUE_SCAN_LIMIT,
  PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS,
  providerSyncStillCovered,
} from "../../domain/policies/provider-sync-enqueue-coverage.ts";
import type { EnqueueProviderSyncJobUseCase } from "../enqueue-provider-sync-job/enqueue-provider-sync-job.use-case.ts";

export interface EnqueuedProviderSyncJobRef {
  readonly id: string;
  readonly requestId: string;
}

export interface EnqueueDueProviderSyncsResult {
  readonly enqueued: number;
  readonly alreadyCovered: number;
  readonly deferred: number;
  readonly jobs: readonly EnqueuedProviderSyncJobRef[];
}

export class EnqueueDueProviderSyncsUseCase {
  constructor(
    private readonly deps: {
      readonly targets: DueProviderSyncTargetFeed;
      readonly jobs: Pick<ProviderSyncJobRepository, "findLatest">;
      readonly enqueue: Pick<EnqueueProviderSyncJobUseCase, "execute">;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
      readonly cooldownMs?: number;
      readonly maxEnqueues?: number;
      readonly scanLimit?: number;
    },
  ) {}

  async execute(): Promise<EnqueueDueProviderSyncsResult> {
    const now = this.deps.clock.now();
    const maxEnqueues = this.deps.maxEnqueues ?? PROVIDER_SYNC_DUE_ENQUEUE_LIMIT;
    const targets = await this.deps.targets.list({
      now,
      limit: this.deps.scanLimit ?? PROVIDER_SYNC_DUE_SCAN_LIMIT,
    });
    const cooldownMs = this.deps.cooldownMs ?? PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS;
    let enqueued = 0;
    let alreadyCovered = 0;
    let index = 0;
    const jobs: EnqueuedProviderSyncJobRef[] = [];

    while (index < targets.length && enqueued < maxEnqueues) {
      const target = targets[index];
      if (!target) break;
      index += 1;
      const dedupeKey = providerSyncDedupeKey({
        providerKey: target.providerKey,
        sync: target,
      });
      const latest = await this.deps.jobs.findLatest({
        organizationId: target.organizationId,
        dedupeKey,
      });
      if (providerSyncStillCovered(latest, now, cooldownMs)) {
        alreadyCovered += 1;
        continue;
      }
      const requestId = this.deps.ids.generate();
      const job = await this.deps.enqueue.execute({
        organizationId: target.organizationId,
        providerKey: target.providerKey,
        requestId,
        sync: {
          externalClubId: target.externalClubId,
          platform: target.platform,
          gameEdition: target.gameEdition,
          matchType: target.matchType,
          maxResultCount: target.maxResultCount,
        },
      });
      if (job.requestId !== requestId) {
        alreadyCovered += 1;
        continue;
      }
      enqueued += 1;
      jobs.push({ id: job.id, requestId: job.requestId });
    }

    return {
      enqueued,
      alreadyCovered,
      deferred: targets.length - index,
      jobs,
    };
  }
}
