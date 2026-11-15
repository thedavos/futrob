import type { OrganizationId } from "@futrob/shared-kernel";
import type { QuotaKey } from "../entities/plan.ts";

export interface QuotaConsumptionRequest {
  readonly organizationId: OrganizationId;
  readonly quota: QuotaKey;
  /** Idempotency key, e.g. the provider sync job id. */
  readonly usageKey: string;
  readonly periodKey: string;
  /** `null` records usage without a ceiling. */
  readonly limit: number | null;
  readonly consumedAt: Date;
}

export type QuotaConsumptionOutcome =
  | { readonly outcome: "consumed"; readonly used: number }
  /** The usage key was already recorded; nothing new was consumed. */
  | { readonly outcome: "replayed"; readonly used: number }
  | { readonly outcome: "exhausted"; readonly used: number };

/**
 * Must check availability and insert atomically per organization, quota and period,
 * and treat a repeated usage key as a replay.
 */
export interface QuotaLedgerPort {
  consume(request: QuotaConsumptionRequest): Promise<QuotaConsumptionOutcome>;
  /** Removes a reservation whose usage never materialized. */
  release(input: {
    readonly organizationId: OrganizationId;
    readonly quota: QuotaKey;
    readonly usageKey: string;
  }): Promise<void>;
  used(input: {
    readonly organizationId: OrganizationId;
    readonly quota: QuotaKey;
    readonly periodKey: string;
  }): Promise<number>;
}
