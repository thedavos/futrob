import { RequirePremiumAnalyticsUseCase } from "@futrob/analytics";
import {
  AssignOrganizationPlanUseCase,
  CheckOrganizationFeatureUseCase,
  ConsumeOrganizationQuotaUseCase,
  GetOrganizationEntitlementsUseCase,
  GetOrganizationPlanUseCase,
  ListOrganizationPlansUseCase,
  ReleaseOrganizationQuotaUseCase,
  ResolveActorEntitlementsUseCase,
  ResolveOrganizationEntitlementsUseCase,
} from "@futrob/billing";
import type {
  AuthorizationPort,
  ClockPort,
  IdGeneratorPort,
  TransactionPort,
} from "@futrob/shared-kernel";
import type { CompetitionRepository } from "@futrob/competitions";
import type { MembershipRepository } from "@futrob/organizations";
import type { Pool } from "pg";
import { OrganizationPlanUsageQuery } from "@/application/billing/organization-plan-usage.query.ts";
import {
  BillingCompetitionPlanLimits,
  BillingPerformanceRankingAccess,
  BillingPremiumAnalyticsAccess,
  BillingProviderSyncQuota,
  BillingStaffSeatLimit,
} from "@/adapters/billing/plan-limit.bridges.ts";
import { InMemoryPlanCatalog, PostgresPlanCatalog } from "@/adapters/billing/plan-catalog.ts";
import { InMemoryQuotaLedger, PostgresQuotaLedger } from "@/adapters/billing/quota-ledger.ts";
import {
  InMemoryPlanChangeAuditRepository,
  InMemorySubscriptionRepository,
  PostgresPlanChangeAuditRepository,
  PostgresSubscriptionRepository,
} from "@/adapters/billing/subscriptions.ts";

export function createBillingModule(
  pool: Pool | undefined,
  authorization: AuthorizationPort,
  shared: {
    readonly transaction: TransactionPort;
    readonly clock: ClockPort;
    readonly ids: IdGeneratorPort;
  },
) {
  const deps = { pool, authorization, ...shared };
  const catalog = deps.pool ? new PostgresPlanCatalog(deps.pool) : new InMemoryPlanCatalog();
  const subscriptions = deps.pool
    ? new PostgresSubscriptionRepository(deps.pool)
    : new InMemorySubscriptionRepository();
  const audit = deps.pool
    ? new PostgresPlanChangeAuditRepository(deps.pool)
    : new InMemoryPlanChangeAuditRepository();
  const ledger = deps.pool ? new PostgresQuotaLedger(deps.pool) : new InMemoryQuotaLedger();
  const resolve = new ResolveOrganizationEntitlementsUseCase({
    catalog,
    subscriptions,
    clock: deps.clock,
  });
  const checkFeature = new CheckOrganizationFeatureUseCase(resolve);
  const consumeQuota = new ConsumeOrganizationQuotaUseCase({
    resolve,
    ledger,
    clock: deps.clock,
  });
  const releaseQuota = new ReleaseOrganizationQuotaUseCase(ledger);
  const premiumAnalyticsAccess = new BillingPremiumAnalyticsAccess(resolve);

  return {
    useCases: {
      resolveOrganizationEntitlements: resolve,
      resolveActorEntitlements: new ResolveActorEntitlementsUseCase({
        catalog,
        subscriptions,
        clock: deps.clock,
      }),
      checkFeature,
      consumeQuota,
      releaseQuota,
      listPlans: new ListOrganizationPlansUseCase(catalog),
      getOrganizationPlan: new GetOrganizationPlanUseCase({
        authorization: deps.authorization,
        resolve,
        ledger,
        audit,
        clock: deps.clock,
      }),
      getOrganizationEntitlements: new GetOrganizationEntitlementsUseCase({
        authorization: deps.authorization,
        resolve,
      }),
      assignOrganizationPlan: new AssignOrganizationPlanUseCase({
        authorization: deps.authorization,
        catalog,
        subscriptions,
        audit,
        transaction: deps.transaction,
        clock: deps.clock,
        ids: deps.ids,
      }),
      /** Gate prepared for analytics use cases; nothing consumes it yet (ADR-0025). */
      requirePremiumAnalytics: new RequirePremiumAnalyticsUseCase(premiumAnalyticsAccess),
    },
    /** Ports each consumer context declared, implemented over billing. */
    planLimits: {
      competitions: new BillingCompetitionPlanLimits(resolve),
      staffSeats: new BillingStaffSeatLimit(resolve),
      providerSyncQuota: new BillingProviderSyncQuota({
        consume: consumeQuota,
        release: releaseQuota,
      }),
      performanceRanking: new BillingPerformanceRankingAccess(checkFeature),
      premiumAnalytics: premiumAnalyticsAccess,
    },
  };
}

export type BillingModule = ReturnType<typeof createBillingModule>;

/** Adds the plan page query, whose counts come from contexts created after billing. */
export function withPlanUsage(
  billing: BillingModule,
  competitions: Pick<CompetitionRepository, "listByOrganization">,
  memberships: Pick<MembershipRepository, "countByRole">,
) {
  return {
    ...billing,
    planUsage: new OrganizationPlanUsageQuery({
      plan: billing.useCases.getOrganizationPlan,
      competitions,
      memberships,
    }),
  };
}
