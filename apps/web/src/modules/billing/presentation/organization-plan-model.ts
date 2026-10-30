import type { GetOrganizationPlanResponse, OrganizationPlanKey } from "@futrob/api-contracts";

export type UsageId = "activeCompetitions" | "staffMembers" | "providerSyncJobs";

/** `reached` blocks the next new action of that kind; nothing in progress stops. */
export type UsageLevel = "ok" | "near" | "reached" | "unlimited";

export interface UsageRow {
  readonly id: UsageId;
  readonly used: number;
  readonly limit: number | null;
  readonly level: UsageLevel;
  /** 0–100 for the meter; null when unlimited. */
  readonly percent: number | null;
}

const NEAR_RATIO = 0.8;

export function usageLevel(used: number, limit: number | null): UsageLevel {
  if (limit === null) return "unlimited";
  if (used >= limit) return "reached";
  return used >= limit * NEAR_RATIO ? "near" : "ok";
}

function row(id: UsageId, used: number, limit: number | null): UsageRow {
  return {
    id,
    used,
    limit,
    level: usageLevel(used, limit),
    percent: limit === null ? null : limit === 0 ? 100 : Math.min(100, (used / limit) * 100),
  };
}

export function usageRows(plan: GetOrganizationPlanResponse): readonly UsageRow[] {
  const { limits } = plan.plan.entitlements;
  const sync = plan.quotas.find((quota) => quota.quota === "provider_sync_jobs");
  return [
    row("activeCompetitions", plan.usage.activeCompetitions, limits.activeCompetitions),
    row("staffMembers", plan.usage.staffMembers, limits.staffMembers),
    row("providerSyncJobs", sync?.used ?? 0, sync?.limit ?? null),
  ];
}

/** The next plan up, or null on the top plan. */
export function nextPlan(key: OrganizationPlanKey): OrganizationPlanKey | null {
  if (key === "free") return "pro";
  if (key === "pro") return "league";
  return null;
}

export type PlanStatusView =
  | { readonly kind: "default" }
  | { readonly kind: "active" }
  | { readonly kind: "trialing"; readonly until: string }
  | { readonly kind: "past_due" }
  /** The stored subscription no longer grants its plan, so free applies. */
  | { readonly kind: "lapsed"; readonly planKey: OrganizationPlanKey };

export function planStatus(plan: GetOrganizationPlanResponse): PlanStatusView {
  const subscription = plan.subscription;
  if (!subscription) return { kind: "default" };
  if (plan.source === "fallback") return { kind: "lapsed", planKey: subscription.planKey };
  switch (subscription.state.status) {
    case "trialing":
      return { kind: "trialing", until: subscription.state.trialEndsAt };
    case "past_due":
      return { kind: "past_due" };
    case "active":
    case "canceled":
      return { kind: "active" };
  }
}
