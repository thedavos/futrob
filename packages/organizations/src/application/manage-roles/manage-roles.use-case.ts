import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type AuthorizationMutationLockPort,
  type ClockPort,
  type IdGeneratorPort,
  type OrganizationId,
  type Permission,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { PlatformRoleAssignment } from "../../domain/entities/access-grant.ts";
import type { OrganizationMembership } from "../../domain/entities/organization-membership.ts";
import {
  AuthorizationForbidden,
  LastOrganizerProtected,
  LastSuperuserProtected,
  OrganizationMembershipNotFound,
  PlatformRoleNotFound,
  type ManageOrganizationRoleError,
  type ManageSuperuserError,
} from "../../domain/errors/authorization.errors.ts";
import type {
  AuthorizationAuditRepository,
  PlatformRoleRepository,
} from "../../domain/ports/access-grant.repository.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import { ORGANIZATION_PERMISSION } from "../../domain/policies/organization-permissions.ts";
import type { OrgMembershipRole } from "../../domain/value-objects/organization-membership-role.ts";

interface SharedDependencies {
  readonly authorization: AuthorizationPort;
  readonly audit: AuthorizationAuditRepository;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
  readonly transaction: TransactionPort;
  readonly mutationLock: AuthorizationMutationLockPort;
}

/** Supplied by the deployable because organizer capabilities span bounded contexts. */
export interface OrganizationRoleCapabilityPort {
  permissionsForRole(role: OrgMembershipRole): readonly Permission[];
}

export class ChangeOrganizationRoleUseCase {
  constructor(
    private readonly deps: SharedDependencies & {
      readonly memberships: MembershipRepository;
      readonly roleCapabilities: OrganizationRoleCapabilityPort;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly targetActorId: ActorId;
    readonly role: OrgMembershipRole;
    readonly reason?: string;
  }): Promise<Result<OrganizationMembership, ManageOrganizationRoleError>> {
    return this.deps.transaction.runInTransaction(() =>
      this.deps.mutationLock.runWithActors(
        input.organizationId,
        [input.actorId, input.targetActorId],
        () => this.executeLocked(input),
      ),
    );
  }

  private async executeLocked(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly targetActorId: ActorId;
    readonly role: OrgMembershipRole;
    readonly reason?: string;
  }): Promise<Result<OrganizationMembership, ManageOrganizationRoleError>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ORGANIZATION_PERMISSION.rolesManage,
      scope: { organizationId: input.organizationId },
    });
    if (!decision.allowed) {
      return err(
        new AuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot manage organization roles",
          permission: ORGANIZATION_PERMISSION.rolesManage,
        }),
      );
    }
    for (const permission of this.deps.roleCapabilities.permissionsForRole(input.role)) {
      const delegated = await this.deps.authorization.decide({
        actorId: input.actorId,
        permission,
        scope: { organizationId: input.organizationId },
      });
      if (!delegated.allowed) {
        return err(
          new AuthorizationForbidden({
            code: "authorization.forbidden",
            message: "Cannot assign a role with capabilities outside the actor's authority",
            permission,
          }),
        );
      }
    }
    const current = await this.deps.memberships.findByOrgAndActor(
      input.organizationId,
      input.targetActorId,
    );
    if (!current) {
      return err(
        new OrganizationMembershipNotFound({
          code: "authorization.membership_not_found",
          message: "Organization membership not found",
        }),
      );
    }
    const updated = await this.deps.memberships.updateRoleProtectingLastOrganizer({
      ...current,
      role: input.role,
    });
    if (updated) {
      await this.deps.audit.append({
        id: this.deps.ids.generate(),
        actorId: input.actorId,
        action: "authorization.organization-role.changed",
        targetActorId: input.targetActorId,
        organizationId: input.organizationId,
        scopeType: "organization",
        scopeId: input.organizationId,
        permission: null,
        before: current,
        after: updated,
        reason: input.reason ?? null,
        createdAt: this.deps.clock.now(),
      });
    }
    if (!updated) {
      return err(
        new LastOrganizerProtected({
          code: "authorization.last_organizer",
          message: "The last organizer cannot be demoted",
        }),
      );
    }
    return ok(updated);
  }
}

export class AssignSuperuserUseCase {
  constructor(
    private readonly deps: SharedDependencies & { readonly platformRoles: PlatformRoleRepository },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly targetActorId: ActorId;
    readonly reason?: string;
  }): Promise<Result<PlatformRoleAssignment, AuthorizationForbidden>> {
    return this.deps.transaction.runInTransaction(() =>
      this.deps.mutationLock.runWithActors(null, [input.actorId, input.targetActorId], () =>
        this.executeLocked(input),
      ),
    );
  }

  private async executeLocked(input: {
    readonly actorId: ActorId;
    readonly targetActorId: ActorId;
    readonly reason?: string;
  }): Promise<Result<PlatformRoleAssignment, AuthorizationForbidden>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ORGANIZATION_PERMISSION.superusersManage,
      scope: {},
    });
    if (!decision.allowed) {
      return err(
        new AuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Only a superuser can assign platform roles",
          permission: ORGANIZATION_PERMISSION.superusersManage,
        }),
      );
    }
    const now = this.deps.clock.now();
    const previous = await this.deps.platformRoles.findSuperuser(input.targetActorId);
    if (previous) return ok(previous);
    const assignment = await this.deps.platformRoles.assignSuperuser({
      actorId: input.targetActorId,
      role: "superuser",
      assignedByActorId: input.actorId,
      createdAt: now,
    });
    await this.deps.audit.append({
      id: this.deps.ids.generate(),
      actorId: input.actorId,
      action: "authorization.superuser.assigned",
      targetActorId: input.targetActorId,
      organizationId: null,
      scopeType: "platform",
      scopeId: "platform",
      permission: null,
      before: null,
      after: assignment,
      reason: input.reason ?? null,
      createdAt: now,
    });
    return ok(assignment);
  }
}

export class RevokeSuperuserUseCase {
  constructor(
    private readonly deps: SharedDependencies & { readonly platformRoles: PlatformRoleRepository },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly targetActorId: ActorId;
    readonly reason?: string;
  }): Promise<Result<void, ManageSuperuserError>> {
    return this.deps.transaction.runInTransaction(() =>
      this.deps.mutationLock.runWithActors(null, [input.actorId, input.targetActorId], () =>
        this.executeLocked(input),
      ),
    );
  }

  private async executeLocked(input: {
    readonly actorId: ActorId;
    readonly targetActorId: ActorId;
    readonly reason?: string;
  }): Promise<Result<void, ManageSuperuserError>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ORGANIZATION_PERMISSION.superusersManage,
      scope: {},
    });
    if (!decision.allowed) {
      return err(
        new AuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Only a superuser can revoke platform roles",
          permission: ORGANIZATION_PERMISSION.superusersManage,
        }),
      );
    }
    const previous = await this.deps.platformRoles.findSuperuser(input.targetActorId);
    if (!previous) {
      return err(
        new PlatformRoleNotFound({
          code: "authorization.platform_role_not_found",
          message: "Platform role assignment not found",
        }),
      );
    }
    const outcome = await this.deps.platformRoles.revokeSuperuserProtectingLast(
      input.targetActorId,
    );
    if (outcome === "revoked") {
      await this.deps.audit.append({
        id: this.deps.ids.generate(),
        actorId: input.actorId,
        action: "authorization.superuser.revoked",
        targetActorId: input.targetActorId,
        organizationId: null,
        scopeType: "platform",
        scopeId: "platform",
        permission: null,
        before: previous,
        after: null,
        reason: input.reason ?? null,
        createdAt: this.deps.clock.now(),
      });
    }
    if (outcome === "last-superuser") {
      return err(
        new LastSuperuserProtected({
          code: "authorization.last_superuser",
          message: "The last superuser cannot be revoked",
        }),
      );
    }
    if (outcome === "not-found") {
      return err(
        new PlatformRoleNotFound({
          code: "authorization.platform_role_not_found",
          message: "Platform role assignment not found",
        }),
      );
    }
    return ok(undefined);
  }
}
