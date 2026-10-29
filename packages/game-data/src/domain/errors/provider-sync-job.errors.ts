import { TaggedError } from "@futrob/shared-kernel";

export class ProviderSyncIngestionLeaseLost extends TaggedError("ProviderSyncIngestionLeaseLost")<{
  readonly code: "game_data.sync_ingestion_lease_lost";
  readonly message: string;
}> {}

/** Only new jobs are refused; queued and retried jobs keep running (ADR-0025). */
export class ProviderSyncQuotaExhausted extends TaggedError("ProviderSyncQuotaExhausted")<{
  readonly code: "game_data.sync_quota_exhausted";
  readonly message: string;
  readonly limit: number;
  readonly used: number;
  readonly resetsAt: Date;
}> {}
