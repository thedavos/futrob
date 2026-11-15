import {
  err,
  ok,
  Panic,
  type ActorId,
  type ClockPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import {
  NO_ACTOR_ENTITLEMENTS,
  type ActorEntitlements,
  type OrganizationFeature,
  type OrganizationPlan,
} from "../../domain/entities/plan.ts";
import type { OrganizationSubscription } from "../../domain/entities/subscription.ts";
import { FeatureNotInPlan } from "../../domain/errors/billing.errors.ts";
import { subscriptionGrantsPlan } from "../../domain/policies/effective-plan.ts";
import type { PlanCatalogPort } from "../../domain/ports/plan-catalog.port.ts";
import type { SubscriptionRepository } from "../../domain/ports/subscription.repository.ts";
import { FALLBACK_ORGANIZATION_PLAN } from "../../domain/value-objects/plan-key.ts";

export interface ResolvedOrganizationPlan {
  readonly organizationId: OrganizationId;
  /** Plan whose entitlements apply now. */
  readonly plan: OrganizationPlan;
  /** Stored subscription, even when it no longer grants its plan. */
  readonly subscription: OrganizationSubscription | null;
  readonly source: "subscription" | "fallback";
}

export interface EntitlementResolutionDependencies {
  readonly catalog: PlanCatalogPort;
  readonly subscriptions: SubscriptionRepository;
  readonly clock: ClockPort;
}

/** Internal read for consumer bridges; callers enforce their own capabilities. */
export class ResolveOrganizationEntitlementsUseCase {
  constructor(private readonly deps: EntitlementResolutionDependencies) {}

  async execute(organizationId: OrganizationId): Promise<ResolvedOrganizationPlan> {
    const subscription = await this.deps.subscriptions.findForOrganization(organizationId);
    const granted =
      subscription && subscriptionGrantsPlan(subscription, this.deps.clock.now())
        ? await this.deps.catalog.findOrganizationPlan(subscription.planKey)
        : null;
    if (granted) return { organizationId, plan: granted, subscription, source: "subscription" };
    const fallback = await this.deps.catalog.findOrganizationPlan(FALLBACK_ORGANIZATION_PLAN);
    if (!fallback) throw new Panic("Plan catalog is missing the fallback plan");
    return { organizationId, plan: fallback, subscription, source: "fallback" };
  }
}

export class CheckOrganizationFeatureUseCase {
  constructor(private readonly resolve: ResolveOrganizationEntitlementsUseCase) {}

  async execute(input: {
    readonly organizationId: OrganizationId;
    readonly feature: OrganizationFeature;
  }): Promise<Result<ResolvedOrganizationPlan, FeatureNotInPlan>> {
    const resolved = await this.resolve.execute(input.organizationId);
    if (resolved.plan.entitlements.features[input.feature]) return ok(resolved);
    return err(
      new FeatureNotInPlan({
        code: "billing.feature_not_in_plan",
        message: `The ${resolved.plan.key} plan does not include ${input.feature}`,
        feature: input.feature,
        planKey: resolved.plan.key,
      }),
    );
  }
}

export class ResolveActorEntitlementsUseCase {
  constructor(private readonly deps: EntitlementResolutionDependencies) {}

  async execute(actorId: ActorId): Promise<ActorEntitlements> {
    const subscription = await this.deps.subscriptions.findForActor(actorId);
    if (!subscription || !subscriptionGrantsPlan(subscription, this.deps.clock.now())) {
      return NO_ACTOR_ENTITLEMENTS;
    }
    const addOn = await this.deps.catalog.findActorAddOn(subscription.planKey);
    return addOn?.entitlements ?? NO_ACTOR_ENTITLEMENTS;
  }
}

export class ListOrganizationPlansUseCase {
  constructor(private readonly catalog: PlanCatalogPort) {}

  execute(): Promise<readonly OrganizationPlan[]> {
    return this.catalog.listOrganizationPlans();
  }
}
