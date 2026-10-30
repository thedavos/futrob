import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type OrganizationId,
  type Permission,
  type Result,
} from "@futrob/shared-kernel";
import {
  QUOTA_KEYS,
  type OrganizationEntitlements,
  type QuotaKey,
} from "../../domain/entities/plan.ts";
import type { PlanChangeAuditEntry } from "../../domain/entities/subscription.ts";
import { BillingForbidden } from "../../domain/errors/billing.errors.ts";
import { BILLING_PERMISSION } from "../../domain/policies/billing-permissions.ts";
import { calendarMonthUtc, type QuotaPeriod } from "../../domain/policies/quota-period.ts";
import type { QuotaLedgerPort } from "../../domain/ports/quota-ledger.port.ts";
import type { PlanChangeAuditRepository } from "../../domain/ports/subscription.repository.ts";
import type { OrganizationPlanKey } from "../../domain/value-objects/plan-key.ts";
import type {
  ResolveOrganizationEntitlementsUseCase,
  ResolvedOrganizationPlan,
} from "../resolve-entitlements/resolve-entitlements.use-case.ts";

export interface QuotaUsage {
  readonly quota: QuotaKey;
  readonly used: number;
  readonly limit: number | null;
  readonly fairUse: boolean;
  readonly period: QuotaPeriod;
}

export interface OrganizationPlanOverview extends ResolvedOrganizationPlan {
  readonly quotas: readonly QuotaUsage[];
  readonly recentChanges: readonly PlanChangeAuditEntry[];
}

export interface OrganizationEntitlementsView {
  readonly organizationId: OrganizationId;
  readonly planKey: OrganizationPlanKey;
  readonly entitlements: OrganizationEntitlements;
}

interface ReadInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
}

const RECENT_CHANGES_LIMIT = 10;

async function requireBillingPermission(
  authorization: AuthorizationPort,
  input: ReadInput,
  permission: Permission,
): Promise<BillingForbidden | null> {
  const decision = await authorization.decide({
    actorId: input.actorId,
    permission,
    scope: { organizationId: input.organizationId },
  });
  return decision.allowed
    ? null
    : new BillingForbidden({
        code: "billing.forbidden",
        message: "The actor cannot read this organization's plan",
        permission,
      });
}

/** Plan, quota usage and recent changes for organization operators. */
export class GetOrganizationPlanUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly resolve: ResolveOrganizationEntitlementsUseCase;
      readonly ledger: QuotaLedgerPort;
      readonly audit: PlanChangeAuditRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(input: ReadInput): Promise<Result<OrganizationPlanOverview, BillingForbidden>> {
    const forbidden = await requireBillingPermission(
      this.deps.authorization,
      input,
      BILLING_PERMISSION.read,
    );
    if (forbidden) return err(forbidden);
    const resolved = await this.deps.resolve.execute(input.organizationId);
    const period = calendarMonthUtc(this.deps.clock.now());
    const quotas = await Promise.all(
      QUOTA_KEYS.map(async (quota): Promise<QuotaUsage> => {
        const allowance = resolved.plan.entitlements.quotas[quota];
        return {
          quota,
          used: await this.deps.ledger.used({
            organizationId: input.organizationId,
            quota,
            periodKey: period.key,
          }),
          limit: allowance.amount,
          fairUse: allowance.fairUse,
          period,
        };
      }),
    );
    const recentChanges = await this.deps.audit.listForOrganization(
      input.organizationId,
      RECENT_CHANGES_LIMIT,
    );
    return ok({ ...resolved, quotas, recentChanges });
  }
}

/** Entitlements only, for any member who needs to hide what the plan excludes. */
export class GetOrganizationEntitlementsUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly resolve: ResolveOrganizationEntitlementsUseCase;
    },
  ) {}

  async execute(input: ReadInput): Promise<Result<OrganizationEntitlementsView, BillingForbidden>> {
    const forbidden = await requireBillingPermission(
      this.deps.authorization,
      input,
      "organizations.read",
    );
    if (forbidden) return err(forbidden);
    const { plan } = await this.deps.resolve.execute(input.organizationId);
    return ok({
      organizationId: input.organizationId,
      planKey: plan.key,
      entitlements: plan.entitlements,
    });
  }
}
