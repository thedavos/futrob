import type { ActorAddOnPlan, OrganizationPlan } from "../entities/plan.ts";
import type { ActorAddOnKey, OrganizationPlanKey } from "../value-objects/plan-key.ts";

/** Catalog data; adapters read it from storage so amounts change without code. */
export interface PlanCatalogPort {
  findOrganizationPlan(key: OrganizationPlanKey): Promise<OrganizationPlan | null>;
  findActorAddOn(key: ActorAddOnKey): Promise<ActorAddOnPlan | null>;
  listOrganizationPlans(): Promise<readonly OrganizationPlan[]>;
}
