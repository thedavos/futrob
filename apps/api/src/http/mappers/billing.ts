import type {
  OrganizationSubscription,
  PlanRequest,
  PlanChangeSnapshot,
  SubscriptionState,
} from "@futrob/billing";
import type { OrganizationPlanUsage } from "@/application/billing/organization-plan-usage.query.ts";

function stateDto(state: SubscriptionState) {
  switch (state.status) {
    case "active":
      return { status: "active" as const };
    case "trialing":
      return { status: "trialing" as const, trialEndsAt: state.trialEndsAt.toISOString() };
    case "past_due":
      return { status: "past_due" as const, pastDueSince: state.pastDueSince.toISOString() };
    case "canceled":
      return { status: "canceled" as const, canceledAt: state.canceledAt.toISOString() };
  }
}

function snapshotDto(snapshot: PlanChangeSnapshot) {
  return { planKey: snapshot.planKey, state: stateDto(snapshot.state) };
}

export function subscriptionDto(subscription: OrganizationSubscription) {
  return {
    planKey: subscription.planKey,
    state: stateDto(subscription.state),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}

/** Only paid plans can be requested, so a stored `free` request would be a defect. */
export function planRequestDto(request: PlanRequest) {
  return { planKey: request.planKey, requestedAt: request.createdAt.toISOString() };
}

export function organizationPlanDto(overview: OrganizationPlanUsage) {
  return {
    organizationId: overview.organizationId,
    plan: {
      key: overview.plan.key,
      version: overview.plan.version,
      entitlements: overview.plan.entitlements,
    },
    source: overview.source,
    subscription: overview.subscription ? subscriptionDto(overview.subscription) : null,
    quotas: overview.quotas.map((quota) => ({
      quota: quota.quota,
      used: quota.used,
      limit: quota.limit,
      fairUse: quota.fairUse,
      periodKey: quota.period.key,
      resetsAt: quota.period.endsAt.toISOString(),
    })),
    usage: overview.usage,
    pendingRequest: overview.pendingRequest ? planRequestDto(overview.pendingRequest) : null,
    recentChanges: overview.recentChanges.map((change) => ({
      id: change.id,
      changedByActorId: change.changedByActorId,
      before: change.before ? snapshotDto(change.before) : null,
      after: snapshotDto(change.after),
      reason: change.reason,
      occurredAt: change.occurredAt.toISOString(),
    })),
  };
}
