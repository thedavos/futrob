import type { Result } from "@futrob/shared-kernel";
import type { ProviderSyncQuotaExhausted } from "../errors/provider-sync-job.errors.ts";

/**
 * The organization's monthly allowance of new sync jobs (ADR-0025), implemented by the
 * deployable. Reserving the same job id twice must not consume twice.
 */
export interface ProviderSyncQuotaPort {
  reserve(input: {
    readonly organizationId: string;
    readonly jobId: string;
  }): Promise<Result<void, ProviderSyncQuotaExhausted>>;
  /** Returns a reservation whose job was never stored. */
  release(input: { readonly organizationId: string; readonly jobId: string }): Promise<void>;
}
