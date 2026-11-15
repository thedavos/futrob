/** Organization plans in upgrade order. */
export const ORGANIZATION_PLAN_KEYS = ["free", "pro", "league"] as const;
export type OrganizationPlanKey = (typeof ORGANIZATION_PLAN_KEYS)[number];

/** Personal add-ons owned by an Actor, never by an organization. */
export const ACTOR_ADD_ON_KEYS = ["player_premium"] as const;
export type ActorAddOnKey = (typeof ACTOR_ADD_ON_KEYS)[number];

export type PlanKey = OrganizationPlanKey | ActorAddOnKey;

/** Plan an organization resolves to without a live subscription. */
export const FALLBACK_ORGANIZATION_PLAN: OrganizationPlanKey = "free";

export function isOrganizationPlanKey(value: string): value is OrganizationPlanKey {
  return ORGANIZATION_PLAN_KEYS.some((key) => key === value);
}

export function isActorAddOnKey(value: string): value is ActorAddOnKey {
  return ACTOR_ADD_ON_KEYS.some((key) => key === value);
}
