import type { Result } from "@futrob/shared-kernel";
import type { ProviderMatch } from "../entities/provider-match.ts";
import type { RunningProviderSyncJob } from "../entities/provider-sync-job.ts";

export interface ProviderSyncCompletionFailure {
  readonly code: string;
}

/** Durable discovery input, without copying player observations into the job. */
export interface ProviderSyncMatchTarget {
  readonly provider: ProviderMatch["provider"];
  readonly game: ProviderMatch["game"];
  readonly occurredAt: Date;
  readonly home: Pick<ProviderMatch["home"], "externalClubId">;
  readonly away: Pick<ProviderMatch["away"], "externalClubId">;
}

export interface ProviderSyncCompletionPort {
  complete(input: {
    readonly job: RunningProviderSyncJob;
    readonly matches: readonly ProviderSyncMatchTarget[];
  }): Promise<Result<void, ProviderSyncCompletionFailure>>;
}
