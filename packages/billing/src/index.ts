export {
  ACTOR_ADD_ON_KEYS,
  FALLBACK_ORGANIZATION_PLAN,
  isActorAddOnKey,
  isOrganizationPlanKey,
  ORGANIZATION_PLAN_KEYS,
  type ActorAddOnKey,
  type OrganizationPlanKey,
  type PlanKey,
} from "./domain/value-objects/plan-key.ts";
export {
  NO_ACTOR_ENTITLEMENTS,
  QUOTA_KEYS,
  type ActorAddOnPlan,
  type ActorEntitlements,
  type NotificationChannel,
  type OrganizationEntitlements,
  type OrganizationFeature,
  type OrganizationPlan,
  type OrganizerAnalyticsLevel,
  type Plan,
  type PlanLimit,
  type PortalBranding,
  type QuotaAllowance,
  type QuotaKey,
} from "./domain/entities/plan.ts";
export {
  isOrganizationSubscription,
  type ActorSubscription,
  type OrganizationSubscription,
  type PlanChangeAuditEntry,
  type PlanChangeSnapshot,
  type Subscription,
  type SubscriptionState,
  type SubscriptionStatus,
  type SubscriptionSubject,
} from "./domain/entities/subscription.ts";
export {
  DEFAULT_ACTOR_ADD_ONS,
  DEFAULT_ORGANIZATION_PLANS,
} from "./domain/policies/default-plan-catalog.ts";
export { subscriptionGrantsPlan } from "./domain/policies/effective-plan.ts";
export { calendarMonthUtc, type QuotaPeriod } from "./domain/policies/quota-period.ts";
export { BILLING_PERMISSION, BILLING_PERMISSIONS } from "./domain/policies/billing-permissions.ts";
export {
  BillingForbidden,
  FeatureNotInPlan,
  InvalidSubscription,
  PaymentProviderUnavailable,
  PlanNotFound,
  QuotaExhausted,
  type AssignOrganizationPlanError,
} from "./domain/errors/billing.errors.ts";

export type { PlanCatalogPort } from "./domain/ports/plan-catalog.port.ts";
export type {
  PlanChangeAuditRepository,
  SubscriptionRepository,
} from "./domain/ports/subscription.repository.ts";
export type {
  QuotaConsumptionOutcome,
  QuotaConsumptionRequest,
  QuotaLedgerPort,
} from "./domain/ports/quota-ledger.port.ts";
export type { PaymentProviderPort } from "./domain/ports/payment-provider.port.ts";

export {
  CheckOrganizationFeatureUseCase,
  ListOrganizationPlansUseCase,
  ResolveActorEntitlementsUseCase,
  ResolveOrganizationEntitlementsUseCase,
  type EntitlementResolutionDependencies,
  type ResolvedOrganizationPlan,
} from "./application/resolve-entitlements/resolve-entitlements.use-case.ts";
export {
  ConsumeOrganizationQuotaUseCase,
  ReleaseOrganizationQuotaUseCase,
  type OrganizationQuotaInput,
  type QuotaConsumption,
} from "./application/consume-quota/consume-quota.use-case.ts";
export {
  AssignOrganizationPlanUseCase,
  type AssignOrganizationPlanInput,
  type RequestedSubscriptionState,
} from "./application/assign-organization-plan/assign-organization-plan.use-case.ts";
export {
  GetOrganizationEntitlementsUseCase,
  GetOrganizationPlanUseCase,
  type OrganizationEntitlementsView,
  type OrganizationPlanOverview,
  type QuotaUsage,
} from "./application/get-organization-plan/get-organization-plan.use-case.ts";
