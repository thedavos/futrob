import type {
  ActorId,
  AuthorizationScopeType,
  OrganizationId,
  Permission,
} from "@futrob/shared-kernel";
import type {
  AccessGrant,
  AuthorizationAuditEntry,
  PlatformRoleAssignment,
} from "../entities/access-grant.ts";

export interface AccessGrantRepository {
  findById(organizationId: OrganizationId | null, id: string): Promise<AccessGrant | null>;
  findByKey(input: {
    readonly organizationId: OrganizationId | null;
    readonly actorId: ActorId;
    readonly permission: Permission;
    readonly scopeType: AuthorizationScopeType;
    readonly scopeId: string;
  }): Promise<AccessGrant | null>;
  listForActorAndScopes(
    actorId: ActorId,
    organizationId: OrganizationId | null,
    scopes: readonly { readonly scopeType: AuthorizationScopeType; readonly scopeId: string }[],
  ): Promise<readonly AccessGrant[]>;
  listForScope(
    organizationId: OrganizationId | null,
    scopeType: AuthorizationScopeType,
    scopeId: string,
    actorId?: ActorId,
  ): Promise<readonly AccessGrant[]>;
  upsert(grant: AccessGrant): Promise<AccessGrant>;
  delete(organizationId: OrganizationId | null, id: string): Promise<boolean>;
}

export interface PlatformRoleRepository {
  findSuperuser(actorId: ActorId): Promise<PlatformRoleAssignment | null>;
  countSuperusers(): Promise<number>;
  assignInitialSuperuserIfEmpty(
    assignment: PlatformRoleAssignment,
  ): Promise<PlatformRoleAssignment | null>;
  assignSuperuser(assignment: PlatformRoleAssignment): Promise<PlatformRoleAssignment>;
  revokeSuperuser(actorId: ActorId): Promise<boolean>;
  revokeSuperuserProtectingLast(
    actorId: ActorId,
  ): Promise<"revoked" | "not-found" | "last-superuser">;
}

export interface AuthorizationAuditRepository {
  append(entry: AuthorizationAuditEntry): Promise<void>;
  listByOrganization(
    organizationId: OrganizationId,
    limit: number,
  ): Promise<readonly AuthorizationAuditEntry[]>;
}
