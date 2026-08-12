import type { ClockPort, IdGeneratorPort, Result } from "@futrob/shared-kernel";
import type { ProviderMatch } from "../../domain/entities/provider-match.ts";
import type { ProviderSyncJob } from "../../domain/entities/provider-sync-job.ts";
import {
  ProviderHttpFailed,
  ProviderNetworkError,
  ProviderTimeout,
  ProviderUnavailable,
  type ProviderError,
} from "../../domain/errors/provider.errors.ts";
import type { GetRecentMatchesInput } from "../../domain/ports/game-data-provider.port.ts";
import type { ProviderSyncJobRepository } from "../../domain/ports/provider-sync-job.repository.ts";
import type { GameDataProviderKey } from "../../domain/value-objects/provider-key.ts";

export class ExecuteProviderSyncJobUseCase {
  constructor(
    private readonly deps: {
      readonly jobs: ProviderSyncJobRepository;
      readonly sync: {
        execute(
          providerKey: GameDataProviderKey,
          input: GetRecentMatchesInput,
        ): Promise<Result<readonly ProviderMatch[], ProviderError>>;
      };
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
      readonly leaseMs: number;
      readonly retryDelayMs: (error: ProviderError, attempt: number) => number;
    },
  ) {}

  async execute(jobId?: string): Promise<ProviderSyncJob | null> {
    if (jobId) {
      const delivered = await this.deps.jobs.findById(jobId);
      if (delivered?.status === "succeeded" || delivered?.status === "dead") return delivered;
    }

    const now = this.deps.clock.now();
    const claimed = await this.deps.jobs.claimNext({
      now,
      jobId,
      leaseToken: this.deps.ids.generate(),
      leaseExpiresAt: new Date(now.getTime() + this.deps.leaseMs),
    });
    if (!claimed) return jobId ? this.deps.jobs.findById(jobId) : null;

    const result = await this.deps.sync.execute(claimed.providerKey, claimed.sync);
    const completedAt = this.deps.clock.now();
    if (result.isOk()) {
      await this.deps.jobs.succeed({
        id: claimed.id,
        leaseToken: claimed.leaseToken,
        completedAt,
      });
      return this.deps.jobs.findById(claimed.id);
    }

    const errorCode = result.error.code;
    if (isRetryableProviderError(result.error) && claimed.attempt < claimed.maxAttempts) {
      await this.deps.jobs.scheduleRetry({
        id: claimed.id,
        leaseToken: claimed.leaseToken,
        availableAt: new Date(
          completedAt.getTime() + this.deps.retryDelayMs(result.error, claimed.attempt),
        ),
        lastErrorCode: errorCode,
      });
    } else {
      await this.deps.jobs.moveToDead({
        id: claimed.id,
        leaseToken: claimed.leaseToken,
        completedAt,
        lastErrorCode: errorCode,
      });
    }
    return this.deps.jobs.findById(claimed.id);
  }
}

export function isRetryableProviderError(error: ProviderError): boolean {
  if (ProviderTimeout.is(error) || ProviderNetworkError.is(error) || ProviderUnavailable.is(error))
    return true;
  return (
    ProviderHttpFailed.is(error) &&
    (error.status === 408 || error.status === 429 || error.status >= 500)
  );
}
