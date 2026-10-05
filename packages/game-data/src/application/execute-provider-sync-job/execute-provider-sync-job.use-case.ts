import { ok, type ClockPort, type IdGeneratorPort, type Result } from "@futrob/shared-kernel";
import type { ProviderMatch } from "../../domain/entities/provider-match.ts";
import type {
  ProviderSyncJob,
  RunningProviderSyncJob,
} from "../../domain/entities/provider-sync-job.ts";
import type { ProviderError } from "../../domain/errors/provider.errors.ts";
import { ProviderSyncIngestionLeaseLost } from "../../domain/errors/provider-sync-job.errors.ts";
import { isRetryableProviderError } from "../../domain/policies/classify-provider-failure.ts";
import type { GetRecentMatchesInput } from "../../domain/ports/game-data-provider.port.ts";
import type { ProviderSyncJobRepository } from "../../domain/ports/provider-sync-job.repository.ts";
import type { ProviderSyncCompletionPort } from "../../domain/ports/provider-sync-completion.port.ts";
import type { GameDataProviderKey } from "../../domain/value-objects/provider-key.ts";

export class ExecuteProviderSyncJobUseCase {
  constructor(
    private readonly deps: {
      readonly jobs: ProviderSyncJobRepository;
      readonly completion: ProviderSyncCompletionPort;
      readonly sync: {
        execute(
          providerKey: GameDataProviderKey,
          input: GetRecentMatchesInput,
          afterPersist: (matches: readonly ProviderMatch[]) => Promise<void>,
        ): Promise<Result<readonly ProviderMatch[], ProviderError>>;
      };
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
      readonly leaseMs: number;
      readonly retryDelayMs: (error: ProviderError, attempt: number) => number;
      readonly completionRetryDelayMs: (attempt: number) => number;
      readonly runClaimed?: <T>(
        job: RunningProviderSyncJob,
        operation: () => Promise<T>,
      ) => Promise<T>;
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

    const run = async () => this.executeClaimed(claimed);
    return this.deps.runClaimed ? this.deps.runClaimed(claimed, run) : run();
  }

  private async executeClaimed(claimed: RunningProviderSyncJob): Promise<ProviderSyncJob | null> {
    const result =
      claimed.ingestedMatches !== undefined
        ? ok(claimed.ingestedMatches)
        : await this.deps.sync.execute(claimed.providerKey, claimed.sync, async (matches) => {
            const recorded = await this.deps.jobs.recordIngestion({
              id: claimed.id,
              leaseToken: claimed.leaseToken,
              matches: matches.map(({ provider, game, occurredAt, home, away }) => ({
                provider,
                game,
                occurredAt,
                home: { externalClubId: home.externalClubId },
                away: { externalClubId: away.externalClubId },
              })),
            });
            // Throw inside the ingestion transaction: a stale lease must not commit matches
            // without a recoverable handoff owned by the current job runner.
            if (!recorded)
              throw new ProviderSyncIngestionLeaseLost({
                code: "game_data.sync_ingestion_lease_lost",
                message: "Provider sync ingestion lease lost",
              });
          });
    if (result.isOk()) {
      const completion = await this.deps.completion.complete({
        job: claimed,
        matches: result.value,
      });
      const completedAt = this.deps.clock.now();
      if (!completion.isOk()) {
        await this.deps.jobs.scheduleRetry({
          id: claimed.id,
          leaseToken: claimed.leaseToken,
          availableAt: new Date(
            completedAt.getTime() + this.deps.completionRetryDelayMs(claimed.attempt),
          ),
          lastErrorCode: completion.error.code,
        });
        return this.deps.jobs.findById(claimed.id);
      }
      await this.deps.jobs.succeed({
        id: claimed.id,
        leaseToken: claimed.leaseToken,
        completedAt,
      });
      return this.deps.jobs.findById(claimed.id);
    }

    const completedAt = this.deps.clock.now();
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
