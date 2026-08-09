import type {
  ActorId,
  AuthorizationScopeType,
  OrganizationId,
  Permission,
} from "@futrob/shared-kernel";

export type GrantEffect = "allow" | "deny";

export interface AccessGrant {
  readonly id: string;
  readonly organizationId: OrganizationId | null;
  readonly actorId: ActorId;
  readonly permission: Permission;
  readonly effect: GrantEffect;
  readonly scopeType: AuthorizationScopeType;
  readonly scopeId: string;
  readonly grantedByActorId: ActorId;
  readonly reason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PlatformRoleAssignment {
  readonly actorId: ActorId;
  readonly role: "superuser";
  readonly assignedByActorId: ActorId;
  readonly createdAt: Date;
}

export interface AuthorizationAuditEntry {
  readonly id: string;
  readonly actorId: ActorId;
  readonly action: string;
  readonly targetActorId: ActorId;
  readonly organizationId: OrganizationId | null;
  readonly scopeType: AuthorizationScopeType;
  readonly scopeId: string;
  readonly permission: Permission | null;
  readonly before: unknown;
  readonly after: unknown;
  readonly reason: string | null;
  readonly createdAt: Date;
}
