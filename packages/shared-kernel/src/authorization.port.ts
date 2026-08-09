import type { ActorId, CompetitionId, EncounterId, OrganizationId, TeamId } from "./identifiers.ts";

/** Stable permission identifier owned by a bounded context. */
export type Permission = `${string}.${string}`;

export type AuthorizationScopeType =
  | "platform"
  | "organization"
  | "competition"
  | "team"
  | "encounter";

/**
 * Trusted resource chain used by application use cases. More specific scopes
 * include their ancestors so adapters can reject mismatched tenant chains.
 */
export interface AuthorizationScope {
  readonly organizationId?: OrganizationId;
  readonly competitionId?: CompetitionId;
  readonly teamId?: TeamId;
  readonly encounterId?: EncounterId;
}

export interface AuthorizationRequest {
  readonly actorId: ActorId;
  readonly permission: Permission;
  readonly scope: AuthorizationScope;
}

export type AuthorizationDecisionReason =
  | "allowed"
  | "denied"
  | "no-assignment"
  | "scope-not-found"
  | "scope-mismatch";

export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly permission: Permission;
  readonly scope: AuthorizationScope;
  readonly reason: AuthorizationDecisionReason;
}

export interface EffectiveRole {
  readonly scopeType: AuthorizationScopeType;
  readonly scopeId: string;
  readonly role: string;
}

export interface EffectivePermission {
  readonly permission: Permission;
  readonly allowed: boolean;
  readonly decidedAt: AuthorizationScopeType;
}

export interface EffectiveAccess {
  readonly actorId: ActorId;
  readonly scope: AuthorizationScope;
  readonly roles: readonly EffectiveRole[];
  readonly permissions: readonly EffectivePermission[];
}

/**
 * Cross-cutting decision port. Policies and assignments remain owned by their
 * bounded contexts; deployables compose them behind this interface.
 */
export interface AuthorizationPort {
  decide(request: AuthorizationRequest): Promise<AuthorizationDecision>;
  getEffectiveAccess(input: {
    readonly actorId: ActorId;
    readonly scope: AuthorizationScope;
    readonly permissions?: readonly Permission[];
  }): Promise<EffectiveAccess>;
}

/** Serializes decisions with mutations that can change an actor's effective authority. */
export interface AuthorizationMutationLockPort {
  runWithActors<T>(
    organizationId: OrganizationId | null,
    actorIds: readonly ActorId[],
    operation: () => Promise<T>,
  ): Promise<T>;
}
