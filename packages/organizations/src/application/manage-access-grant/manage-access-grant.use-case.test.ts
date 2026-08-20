import { describe, expect, it } from "vite-plus/test";
import { unwrapErr } from "@futrob/test-support";
import {
  asActorId,
  asOrganizationId,
  type ActorId,
  type AuthorizationPort,
  type OrganizationId,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { AccessGrant } from "../../domain/entities/access-grant.ts";
import type { OrganizationMembership } from "../../domain/entities/organization-membership.ts";
import type {
  AccessGrantRepository,
  AuthorizationAuditRepository,
} from "../../domain/ports/access-grant.repository.ts";
import {
  DeleteAccessGrantUseCase,
  UpsertAccessGrantUseCase,
} from "./manage-access-grant.use-case.ts";

const actorId = asActorId("organizer-1");
const targetActorId = asActorId("member-1");
const organizationId = asOrganizationId("org-1");
const otherOrganizationId = asOrganizationId("org-2");

describe("contextual access grant management", () => {
  it("rejects a scopeType/scopeId mismatch before persisting", async () => {
    const grants = grantRepository();
    const useCase = new UpsertAccessGrantUseCase(dependencies(grants));

    const result = await useCase.execute({
      actorId,
      targetActorId,
      organizationId,
      permission: "teams.update",
      effect: "allow",
      scopeType: "organization",
      scopeId: "another-org",
      scope: { organizationId },
    });

    expect(unwrapErr(result).code).toBe("authorization.scope_not_found");
    expect(grants.rows.size).toBe(0);
  });

  it("cannot delete a grant by authorizing against a different tenant", async () => {
    const grant: AccessGrant = {
      id: "grant-1",
      organizationId,
      actorId: targetActorId,
      permission: "teams.update",
      effect: "deny",
      scopeType: "organization",
      scopeId: organizationId,
      grantedByActorId: actorId,
      reason: null,
      createdAt: new Date("2026-08-07T00:00:00.000Z"),
      updatedAt: new Date("2026-08-07T00:00:00.000Z"),
    };
    const grants = grantRepository(grant);
    const useCase = new DeleteAccessGrantUseCase(dependencies(grants));

    const result = await useCase.execute({
      actorId,
      grantId: grant.id,
      scope: { organizationId: otherOrganizationId },
    });

    expect(unwrapErr(result).code).toBe("authorization.grant_not_found");
    expect(grants.rows.has(grant.id)).toBe(true);
  });

  it("cannot reuse an existing grant id to change its target identity", async () => {
    const grant: AccessGrant = {
      id: "grant-1",
      organizationId,
      actorId: targetActorId,
      permission: "teams.update",
      effect: "allow",
      scopeType: "organization",
      scopeId: organizationId,
      grantedByActorId: actorId,
      reason: null,
      createdAt: new Date("2026-08-07T00:00:00.000Z"),
      updatedAt: new Date("2026-08-07T00:00:00.000Z"),
    };
    const grants = grantRepository(grant);
    const result = await new UpsertAccessGrantUseCase(dependencies(grants)).execute({
      id: grant.id,
      actorId,
      targetActorId: asActorId("another-member"),
      organizationId,
      permission: grant.permission,
      effect: "deny",
      scopeType: grant.scopeType,
      scopeId: grant.scopeId,
      scope: { organizationId },
    });

    expect(unwrapErr(result).code).toBe("authorization.scope_not_found");
    expect(grants.rows.get(grant.id)).toEqual(grant);
  });

  it("requires authority over the affected permission when deleting a deny", async () => {
    const grant: AccessGrant = {
      id: "grant-1",
      organizationId,
      actorId: targetActorId,
      permission: "teams.update",
      effect: "deny",
      scopeType: "organization",
      scopeId: organizationId,
      grantedByActorId: actorId,
      reason: null,
      createdAt: new Date("2026-08-07T00:00:00.000Z"),
      updatedAt: new Date("2026-08-07T00:00:00.000Z"),
    };
    const grants = grantRepository(grant);
    const result = await new DeleteAccessGrantUseCase(
      dependencies(grants, (permission) => permission === "authorization.grants.manage"),
    ).execute({ actorId, grantId: grant.id, scope: { organizationId } });

    expect(unwrapErr(result).code).toBe("authorization.forbidden");
    expect(grants.rows.has(grant.id)).toBe(true);
  });
});

function dependencies(
  grants: AccessGrantRepository,
  can: (permission: string) => boolean = () => true,
) {
  return {
    authorization: {
      decide: async (request) => ({
        ...request,
        allowed: can(request.permission),
        reason: can(request.permission) ? ("allowed" as const) : ("denied" as const),
      }),
      getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
    } satisfies AuthorizationPort,
    grants,
    memberships: {
      add: async () => undefined,
      findByActor: async () => [],
      findByOrgAndActor: async (
        requestedOrganizationId: typeof organizationId,
        requestedActorId: typeof targetActorId,
      ) =>
        requestedOrganizationId === organizationId && requestedActorId === targetActorId
          ? {
              organizationId,
              actorId: targetActorId,
              role: "member" as const,
              createdAt: new Date("2026-08-07T00:00:00.000Z"),
            }
          : null,
      updateRole: async (membership: OrganizationMembership) => membership,
      updateRoleProtectingLastOrganizer: async (membership: OrganizationMembership) => membership,
      countByRole: async () => 0,
    },
    transaction: {
      runInTransaction: async <T>(operation: () => Promise<T>) => operation(),
    } satisfies TransactionPort,
    mutationLock: {
      runWithActors: async <T>(
        _organizationId: OrganizationId,
        _actorIds: readonly ActorId[],
        operation: () => Promise<T>,
      ) => operation(),
    },
    audit: {
      append: async () => undefined,
      listByOrganization: async () => [],
    } satisfies AuthorizationAuditRepository,
    clock: { now: () => new Date("2026-08-07T00:00:00.000Z") },
    ids: { generate: () => "generated-id" },
  };
}

function grantRepository(initial?: AccessGrant): AccessGrantRepository & {
  readonly rows: Map<string, AccessGrant>;
} {
  const rows = new Map<string, AccessGrant>();
  if (initial) rows.set(initial.id, initial);
  return {
    rows,
    findById: async (requestedOrganizationId, id) => {
      const row = rows.get(id);
      return row?.organizationId === requestedOrganizationId ? row : null;
    },
    findByKey: async (input) =>
      [...rows.values()].find(
        (row) =>
          row.organizationId === input.organizationId &&
          row.actorId === input.actorId &&
          row.permission === input.permission &&
          row.scopeType === input.scopeType &&
          row.scopeId === input.scopeId,
      ) ?? null,
    listForActorAndScopes: async () => [],
    listForScope: async (requestedOrganizationId, scopeType, scopeId, actorId) =>
      [...rows.values()].filter(
        (row) =>
          row.organizationId === requestedOrganizationId &&
          row.scopeType === scopeType &&
          row.scopeId === scopeId &&
          (!actorId || row.actorId === actorId),
      ),
    upsert: async (grant) => {
      rows.set(grant.id, grant);
      return grant;
    },
    delete: async (requestedOrganizationId, id) => {
      const row = rows.get(id);
      return row?.organizationId === requestedOrganizationId ? rows.delete(id) : false;
    },
  };
}
