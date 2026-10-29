import { TaggedError, type Permission } from "@futrob/shared-kernel";
import type { OrganizationFeature, QuotaKey } from "../entities/plan.ts";
import type { PlanKey } from "../value-objects/plan-key.ts";

export class BillingForbidden extends TaggedError("BillingForbidden")<{
  code: "billing.forbidden";
  message: string;
  permission: Permission;
}> {}

export class PlanNotFound extends TaggedError("PlanNotFound")<{
  code: "billing.plan_not_found";
  message: string;
  planKey: string;
}> {}

export class InvalidSubscription extends TaggedError("InvalidSubscription")<{
  code: "billing.invalid_subscription";
  message: string;
}> {}

export class QuotaExhausted extends TaggedError("QuotaExhausted")<{
  code: "billing.quota_exhausted";
  message: string;
  quota: QuotaKey;
  limit: number;
  used: number;
  periodKey: string;
  resetsAt: Date;
}> {}

export class FeatureNotInPlan extends TaggedError("FeatureNotInPlan")<{
  code: "billing.feature_not_in_plan";
  message: string;
  feature: OrganizationFeature;
  planKey: PlanKey;
}> {}

export class PaymentProviderUnavailable extends TaggedError("PaymentProviderUnavailable")<{
  code: "billing.payment_provider_unavailable";
  message: string;
}> {}

export type AssignOrganizationPlanError = BillingForbidden | PlanNotFound | InvalidSubscription;
