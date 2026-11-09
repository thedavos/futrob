import { err, ok, type ClockPort, type OrganizationId, type Result } from "@futrob/shared-kernel";
import type { QuotaKey } from "../../domain/entities/plan.ts";
import { QuotaExhausted } from "../../domain/errors/billing.errors.ts";
import { calendarMonthUtc, type QuotaPeriod } from "../../domain/policies/quota-period.ts";
import type { QuotaLedgerPort } from "../../domain/ports/quota-ledger.port.ts";
import type { ResolveOrganizationEntitlementsUseCase } from "../resolve-entitlements/resolve-entitlements.use-case.ts";

export interface QuotaConsumption {
  readonly outcome: "consumed" | "replayed";
  readonly used: number;
  readonly limit: number | null;
  readonly period: QuotaPeriod;
}

export interface OrganizationQuotaInput {
  readonly organizationId: OrganizationId;
  readonly quota: QuotaKey;
  readonly usageKey: string;
}

/** Idempotent per usage key: replaying a recorded key never consumes again. */
export class ConsumeOrganizationQuotaUseCase {
  constructor(
    private readonly deps: {
      readonly resolve: ResolveOrganizationEntitlementsUseCase;
      readonly ledger: QuotaLedgerPort;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(input: OrganizationQuotaInput): Promise<Result<QuotaConsumption, QuotaExhausted>> {
    const now = this.deps.clock.now();
    const period = calendarMonthUtc(now);
    const { plan } = await this.deps.resolve.execute(input.organizationId);
    const limit = plan.entitlements.quotas[input.quota].amount;
    const result = await this.deps.ledger.consume({
      organizationId: input.organizationId,
      quota: input.quota,
      usageKey: input.usageKey,
      periodKey: period.key,
      limit,
      consumedAt: now,
    });
    if (result.outcome !== "exhausted") {
      return ok({ outcome: result.outcome, used: result.used, limit, period });
    }
    return err(
      new QuotaExhausted({
        code: "billing.quota_exhausted",
        message: `The ${plan.key} plan has used its ${input.quota} quota for ${period.key}`,
        quota: input.quota,
        limit: limit ?? result.used,
        used: result.used,
        periodKey: period.key,
        resetsAt: period.endsAt,
      }),
    );
  }
}

export class ReleaseOrganizationQuotaUseCase {
  constructor(private readonly ledger: QuotaLedgerPort) {}

  execute(input: OrganizationQuotaInput): Promise<void> {
    return this.ledger.release(input);
  }
}
