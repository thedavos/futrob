import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type AuthorizationMutationLockPort,
  type AuthorizationScope,
  type AuthorizationScopeType,
  type ClockPort,
  type IdGeneratorPort,
  type OrganizationId,
  type Permission,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { AccessGrant, GrantEffect } from "../../domain/entities/access-grant.ts";
import {
  AccessGrantNotFound,
  AuthorizationForbidden,
  AuthorizationScopeNotFound,
  OrganizationMembershipNotFound,
  type ManageAccessGrantError,
} from "../../domain/errors/authorization.errors.ts";
import type {
  AccessGrantRepository,
  AuthorizationAuditRepository,
} from "../../domain/ports/access-grant.repository.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import { ORGANIZATION_PERMISSION } from "../../domain/policies/organization-permissions.ts";

export interface UpsertAccessGrantInput {
  readonly id?: string;
  readonly actorId: ActorId;
  readonly targetActorId: ActorId;
  readonly organizationId: OrganizationId | null;
  readonly permission: Permission;
  readonly effect: GrantEffect;
  readonly scopeType: AuthorizationScopeType;
  readonly scopeId: string;
  readonly scope: AuthorizationScope;
  readonly reason?: string;
}

interface Dependencies {
  readonly authorization: AuthorizationPort;
  readonly grants: AccessGrantRepository;
  readonly audit: AuthorizationAuditRepository;
  readonly memberships: MembershipRepository;
  readonly transaction: TransactionPort;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
  readonly mutationLock: AuthorizationMutationLockPort;
}

export class ListAccessGrantsUseCase {
  constructor(private readonly deps: Pick<Dependencies, "authorization" | "grants">) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly targetActorId?: ActorId;
    readonly organizationId: OrganizationId | null;
    readonly scopeType: AuthorizationScopeType;
    readonly scopeId: string;
    readonly scope: AuthorizationScope;
  }): Promise<Result<readonly AccessGrant[], ManageAccessGrantError>> {
    if (!scopeMatchesGrant(input.scope, input.scopeType, input.scopeId, input.organizationId)) {
      return err(scopeMismatch());
    }
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ORGANIZATION_PERMISSION.grantsManage,
      scope: input.scope,
    });
    if (!decision.allowed) {
      return err(
        new AuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot list grants in this scope",
          permission: ORGANIZATION_PERMISSION.grantsManage,
        }),
      );
    }
    return ok(
      await this.deps.grants.listForScope(
        input.organizationId,
        input.scopeType,
        input.scopeId,
        input.targetActorId,
      ),
    );
  }
}

export class UpsertAccessGrantUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(
    input: UpsertAccessGrantInput,
  ): Promise<Result<AccessGrant, ManageAccessGrantError>> {
    return this.deps.transaction.runInTransaction(() =>
      this.deps.mutationLock.runWithActors(
        input.organizationId,
        [input.actorId, input.targetActorId],
        () => this.executeLocked(input),
      ),
    );
  }

  private async executeLocked(
    input: UpsertAccessGrantInput,
  ): Promise<Result<AccessGrant, ManageAccessGrantError>> {
    if (!scopeMatchesGrant(input.scope, input.scopeType, input.scopeId, input.organizationId)) {
      return err(scopeMismatch());
    }
    const previousById = input.id
      ? await this.deps.grants.findById(input.organizationId, input.id)
      : null;
    const previousByKey = await this.deps.grants.findByKey({
      organizationId: input.organizationId,
      actorId: input.targetActorId,
      permission: input.permission,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
    });
    if (
      (previousById &&
        (previousById.organizationId !== input.organizationId ||
          previousById.actorId !== input.targetActorId ||
          previousById.permission !== input.permission ||
          previousById.scopeType !== input.scopeType ||
          previousById.scopeId !== input.scopeId)) ||
      (previousById && previousByKey && previousById.id !== previousByKey.id)
    ) {
      return err(scopeMismatch());
    }
    const previous = previousById ?? previousByKey;
    const canManage = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ORGANIZATION_PERMISSION.grantsManage,
      scope: input.scope,
    });
    const canDelegate = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: input.permission,
      scope: input.scope,
    });
    if (!canManage.allowed || !canDelegate.allowed) {
      return err(
        new AuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot grant a permission outside the actor's effective authority",
          permission: input.permission,
        }),
      );
    }
    if (
      input.organizationId &&
      !(await this.deps.memberships.findByOrgAndActor(input.organizationId, input.targetActorId))
    ) {
      return err(
        new OrganizationMembershipNotFound({
          code: "authorization.membership_not_found",
          message: "The grant target is not a member of this organization",
        }),
      );
    }

    const now = this.deps.clock.now();
    const grant: AccessGrant = {
      id: previous?.id ?? input.id ?? this.deps.ids.generate(),
      organizationId: input.organizationId,
      actorId: input.targetActorId,
      permission: input.permission,
      effect: input.effect,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      grantedByActorId: input.actorId,
      reason: input.reason ?? null,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    const saved = await this.deps.grants.upsert(grant);
    await this.deps.audit.append({
      id: this.deps.ids.generate(),
      actorId: input.actorId,
      action: previous ? "authorization.grant.updated" : "authorization.grant.created",
      targetActorId: input.targetActorId,
      organizationId: input.organizationId,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      permission: input.permission,
      before: previous,
      after: saved,
      reason: input.reason ?? null,
      createdAt: now,
    });
    return ok(saved);
  }
}

export class DeleteAccessGrantUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly grantId: string;
    readonly scope: AuthorizationScope;
    readonly reason?: string;
  }): Promise<Result<void, ManageAccessGrantError>> {
    return this.deps.transaction.runInTransaction(() => this.findAndExecuteLocked(input));
  }

  private async findAndExecuteLocked(input: {
    readonly actorId: ActorId;
    readonly grantId: string;
    readonly scope: AuthorizationScope;
    readonly reason?: string;
  }): Promise<Result<void, ManageAccessGrantError>> {
    const organizationId = input.scope.organizationId ?? null;
    const existing = await this.deps.grants.findById(organizationId, input.grantId);
    if (!existing) {
      return err(
        new AccessGrantNotFound({
          code: "authorization.grant_not_found",
          message: "Access grant not found",
          grantId: input.grantId,
        }),
      );
    }
    return this.deps.mutationLock.runWithActors(
      organizationId,
      [input.actorId, existing.actorId],
      () => this.executeLocked(input, organizationId),
    );
  }

  private async executeLocked(
    input: {
      readonly actorId: ActorId;
      readonly grantId: string;
      readonly scope: AuthorizationScope;
      readonly reason?: string;
    },
    organizationId: OrganizationId | null,
  ): Promise<Result<void, ManageAccessGrantError>> {
    const existing = await this.deps.grants.findById(organizationId, input.grantId);
    if (!existing) {
      return err(
        new AccessGrantNotFound({
          code: "authorization.grant_not_found",
          message: "Access grant not found",
          grantId: input.grantId,
        }),
      );
    }
    if (
      !scopeMatchesGrant(input.scope, existing.scopeType, existing.scopeId, existing.organizationId)
    ) {
      return err(scopeMismatch());
    }
    const canManage = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ORGANIZATION_PERMISSION.grantsManage,
      scope: input.scope,
    });
    const canDelegate = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: existing.permission,
      scope: input.scope,
    });
    if (!canManage.allowed || !canDelegate.allowed) {
      return err(
        new AuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot revoke grants in this scope",
          permission: existing.permission,
        }),
      );
    }
    await this.deps.grants.delete(existing.organizationId, existing.id);
    await this.deps.audit.append({
      id: this.deps.ids.generate(),
      actorId: input.actorId,
      action: "authorization.grant.deleted",
      targetActorId: existing.actorId,
      organizationId: existing.organizationId,
      scopeType: existing.scopeType,
      scopeId: existing.scopeId,
      permission: existing.permission,
      before: existing,
      after: null,
      reason: input.reason ?? null,
      createdAt: this.deps.clock.now(),
    });
    return ok(undefined);
  }
}

function scopeMatchesGrant(
  scope: AuthorizationScope,
  scopeType: AuthorizationScopeType,
  scopeId: string,
  organizationId: OrganizationId | null,
): boolean {
  if (scopeType === "platform") {
    return (
      scopeId === "platform" &&
      organizationId === null &&
      !scope.organizationId &&
      !scope.competitionId &&
      !scope.teamId &&
      !scope.encounterId
    );
  }
  if (!organizationId || scope.organizationId !== organizationId) return false;
  switch (scopeType) {
    case "organization":
      return (
        scope.organizationId === scopeId &&
        !scope.competitionId &&
        !scope.teamId &&
        !scope.encounterId
      );
    case "competition":
      return scope.competitionId === scopeId && !scope.teamId && !scope.encounterId;
    case "team":
      return scope.teamId === scopeId && !scope.encounterId;
    case "encounter":
      return scope.encounterId === scopeId && Boolean(scope.competitionId);
  }
}

function scopeMismatch(): AuthorizationScopeNotFound {
  return new AuthorizationScopeNotFound({
    code: "authorization.scope_not_found",
    message: "Grant scope does not match the requested resource chain",
  });
}
