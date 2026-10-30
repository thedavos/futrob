import type { OrganizationPlanKey } from "@futrob/billing";
import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type { AppModules } from "@/di/app-modules.ts";

/**
 * Puts a fixture organization on a plan through the superuser path, then drops the
 * temporary platform role so the fixture's authorization stays unchanged.
 * `actorId` must already exist (Postgres keeps a foreign key on plan changes).
 */
export async function assignOrganizationPlanForTest(
  modules: AppModules,
  input: {
    readonly organizationId: OrganizationId;
    readonly actorId: ActorId;
    readonly planKey?: OrganizationPlanKey;
  },
): Promise<void> {
  const roles = modules.organizations.repositories.platformRoles;
  const wasSuperuser = (await roles.findSuperuser(input.actorId)) !== null;
  if (!wasSuperuser) {
    await roles.assignSuperuser({
      actorId: input.actorId,
      role: "superuser",
      assignedByActorId: input.actorId,
      createdAt: new Date(),
    });
  }
  try {
    const assigned = await modules.billing.useCases.assignOrganizationPlan.execute({
      actorId: input.actorId,
      organizationId: input.organizationId,
      planKey: input.planKey ?? "league",
      state: { status: "active" },
      reason: "Test fixture",
    });
    if (!assigned.isOk()) throw assigned.error;
  } finally {
    if (!wasSuperuser) await roles.revokeSuperuser(input.actorId);
  }
}
