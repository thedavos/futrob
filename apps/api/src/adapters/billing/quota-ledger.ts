import type {
  QuotaConsumptionOutcome,
  QuotaConsumptionRequest,
  QuotaKey,
  QuotaLedgerPort,
} from "@futrob/billing";
import type { OrganizationId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { getPgExecutor, runInPgAtomicScope } from "@/adapters/persistence/pg-transaction.ts";

const countSchema = z.object({ used: z.coerce.number().int() });

/**
 * Serializes consumers of one organization, quota and period with a transaction-scoped
 * advisory lock, so the availability check and the insert cannot interleave.
 */
export class PostgresQuotaLedger implements QuotaLedgerPort {
  constructor(private readonly pool: Pool) {}

  consume(request: QuotaConsumptionRequest): Promise<QuotaConsumptionOutcome> {
    return runInPgAtomicScope(this.pool, async () => {
      const executor = getPgExecutor(this.pool);
      // Replay keys are global across periods; take this lock before the monthly budget lock.
      await executor.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        `billing-usage:${request.organizationId}:${request.quota}:${request.usageKey}`,
      ]);
      await executor.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        `billing-quota:${request.organizationId}:${request.quota}:${request.periodKey}`,
      ]);
      const used = await this.used(request);
      const existing = await executor.query(
        `SELECT 1 FROM billing_quota_consumptions
         WHERE organization_id = $1 AND quota_key = $2 AND usage_key = $3`,
        [request.organizationId, request.quota, request.usageKey],
      );
      if (existing.rows[0]) return { outcome: "replayed", used };
      if (request.limit !== null && used >= request.limit) return { outcome: "exhausted", used };
      await executor.query(
        `INSERT INTO billing_quota_consumptions (
           organization_id, quota_key, usage_key, period_key, consumed_at
         ) VALUES ($1, $2, $3, $4, $5)`,
        [
          request.organizationId,
          request.quota,
          request.usageKey,
          request.periodKey,
          request.consumedAt.toISOString(),
        ],
      );
      return { outcome: "consumed", used: used + 1 };
    });
  }

  async release(input: {
    readonly organizationId: OrganizationId;
    readonly quota: QuotaKey;
    readonly usageKey: string;
  }): Promise<void> {
    await getPgExecutor(this.pool).query(
      `DELETE FROM billing_quota_consumptions
       WHERE organization_id = $1 AND quota_key = $2 AND usage_key = $3`,
      [input.organizationId, input.quota, input.usageKey],
    );
  }

  async used(input: {
    readonly organizationId: OrganizationId;
    readonly quota: QuotaKey;
    readonly periodKey: string;
  }): Promise<number> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT COUNT(*) AS used FROM billing_quota_consumptions
       WHERE organization_id = $1 AND quota_key = $2 AND period_key = $3`,
      [input.organizationId, input.quota, input.periodKey],
    );
    return countSchema.parse(result.rows[0]).used;
  }
}

interface Consumption {
  readonly organizationId: OrganizationId;
  readonly quota: QuotaKey;
  readonly usageKey: string;
  readonly periodKey: string;
}

export class InMemoryQuotaLedger implements QuotaLedgerPort {
  private readonly consumptions = new Map<string, Consumption>();

  /** Synchronous body: no await between the availability check and the insert. */
  async consume(request: QuotaConsumptionRequest): Promise<QuotaConsumptionOutcome> {
    const used = this.count(request);
    const key = consumptionKey(request);
    if (this.consumptions.has(key)) return { outcome: "replayed", used };
    if (request.limit !== null && used >= request.limit) return { outcome: "exhausted", used };
    this.consumptions.set(key, request);
    return { outcome: "consumed", used: used + 1 };
  }

  async release(input: Omit<Consumption, "periodKey">): Promise<void> {
    this.consumptions.delete(consumptionKey(input));
  }

  async used(input: Omit<Consumption, "usageKey">): Promise<number> {
    return this.count(input);
  }

  private count(input: Omit<Consumption, "usageKey">): number {
    return [...this.consumptions.values()].filter(
      (entry) =>
        entry.organizationId === input.organizationId &&
        entry.quota === input.quota &&
        entry.periodKey === input.periodKey,
    ).length;
  }
}

function consumptionKey(input: Omit<Consumption, "periodKey">): string {
  return `${input.organizationId}\0${input.quota}\0${input.usageKey}`;
}
