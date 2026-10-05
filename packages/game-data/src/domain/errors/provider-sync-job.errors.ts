import { TaggedError } from "@futrob/shared-kernel";

export class ProviderSyncIngestionLeaseLost extends TaggedError("ProviderSyncIngestionLeaseLost")<{
  readonly code: "game_data.sync_ingestion_lease_lost";
  readonly message: string;
}> {}
