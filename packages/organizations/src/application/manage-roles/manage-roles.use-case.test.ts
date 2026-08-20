import { describe, expect, it } from "vite-plus/test";
import { unwrapErr } from "@futrob/test-support";
import { asActorId, asOrganizationId, type AuthorizationPort } from "@futrob/shared-kernel";
import type {
  AuthorizationAuditRepository,
  PlatformRoleRepository,
} from "../../domain/ports/access-grant.repository.ts";
import { createOrgTestHarness } from "../test-harness.ts";
import { ChangeOrganizationRoleUseCase, RevokeSuperuserUseCase } from "./manage-roles.use-case.ts";

const authorization: AuthorizationPort = {
  decide: async (request) => ({ ...request, allowed: true, reason: "allowed" }),
  getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
};

describe("role escalation guards", () => {
  it("protects the last organizer", async () => {
    const harness = createOrgTestHarness();
    const organizationId = asOrganizationId("org-1");
    const organizerId = asActorId("organizer-1");
    harness.organizations.byId.set(organizationId, {
      id: organizationId,
      name: "Org",
      normalizedName: "org",
      createdAt: harness.clock.now(),
      createdByActorId: organizerId,
    });
    await harness.memberships.add({
      organizationId,
      actorId: organizerId,
      role: "organizer",
      createdAt: harness.clock.now(),
    });
    const useCase = new ChangeOrganizationRoleUseCase({
      authorization,
      audit: auditRepository(),
      clock: harness.clock,
      ids: harness.ids,
      memberships: harness.memberships,
      roleCapabilities: { permissionsForRole: () => ["organizations.read"] },
      transaction: { runInTransaction: async (operation) => operation() },
      mutationLock: { runWithActors: async (_org, _actors, operation) => operation() },
    });

    const result = await useCase.execute({
      actorId: organizerId,
      organizationId,
      targetActorId: organizerId,
      role: "member",
    });

    expect(unwrapErr(result).code).toBe("authorization.last_organizer");
  });

  it("protects the last superuser and rejects a missing assignment", async () => {
    const first = asActorId("super-1");
    const roles = platformRoles(first);
    const useCase = new RevokeSuperuserUseCase({
      authorization,
      audit: auditRepository(),
      clock: { now: () => new Date("2026-08-07T00:00:00.000Z") },
      ids: { generate: () => "audit-1" },
      platformRoles: roles,
      transaction: { runInTransaction: async (operation) => operation() },
      mutationLock: { runWithActors: async (_org, _actors, operation) => operation() },
    });

    const missing = await useCase.execute({ actorId: first, targetActorId: asActorId("missing") });
    const last = await useCase.execute({ actorId: first, targetActorId: first });

    expect(unwrapErr(missing).code).toBe("authorization.platform_role_not_found");
    expect(unwrapErr(last).code).toBe("authorization.last_superuser");
  });

  it("cannot promote a role with capabilities the manager does not hold", async () => {
    const harness = createOrgTestHarness();
    const organizationId = asOrganizationId("org-1");
    const managerId = asActorId("manager-1");
    const memberId = asActorId("member-1");
    await harness.memberships.add({
      organizationId,
      actorId: memberId,
      role: "member",
      createdAt: harness.clock.now(),
    });
    const limitedAuthorization: AuthorizationPort = {
      decide: async (request) => ({
        ...request,
        allowed:
          request.permission === "authorization.roles.manage" ||
          request.permission === "organizations.read",
        reason:
          request.permission === "authorization.roles.manage" ||
          request.permission === "organizations.read"
            ? "allowed"
            : "denied",
      }),
      getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
    };
    const result = await new ChangeOrganizationRoleUseCase({
      authorization: limitedAuthorization,
      audit: auditRepository(),
      clock: harness.clock,
      ids: harness.ids,
      memberships: harness.memberships,
      roleCapabilities: {
        permissionsForRole: () => ["organizations.read", "teams.update"],
      },
      transaction: { runInTransaction: async (operation) => operation() },
      mutationLock: { runWithActors: async (_org, _actors, operation) => operation() },
    }).execute({
      actorId: managerId,
      organizationId,
      targetActorId: memberId,
      role: "organizer",
    });

    expect(unwrapErr(result).code).toBe("authorization.forbidden");
    expect(await harness.memberships.findByOrgAndActor(organizationId, memberId)).toMatchObject({
      role: "member",
    });
  });
});

function auditRepository(): AuthorizationAuditRepository {
  return {
    append: async () => undefined,
    listByOrganization: async () => [],
  };
}

function platformRoles(actorId: ReturnType<typeof asActorId>): PlatformRoleRepository {
  const assignment = {
    actorId,
    role: "superuser" as const,
    assignedByActorId: actorId,
    createdAt: new Date("2026-08-07T00:00:00.000Z"),
  };
  return {
    findSuperuser: async (requested) => (requested === actorId ? assignment : null),
    countSuperusers: async () => 1,
    assignInitialSuperuserIfEmpty: async () => null,
    assignSuperuser: async (value) => value,
    revokeSuperuser: async () => true,
    revokeSuperuserProtectingLast: async (requested) =>
      requested === actorId ? "last-superuser" : "not-found",
  };
}
