import type {
  AuthorizationScope,
  AuthorizationScopeType,
  EffectiveRole,
  Permission,
} from "@futrob/shared-kernel";

export interface Layer {
  readonly scopeType: AuthorizationScopeType;
  readonly scopeId: string;
  readonly roles: readonly EffectiveRole[];
  readonly baseline: ReadonlySet<Permission>;
}

export function resolvePermission(
  permission: Permission,
  layers: readonly Layer[],
  grants: readonly {
    readonly permission: Permission;
    readonly effect: "allow" | "deny";
    readonly scopeType: AuthorizationScopeType;
    readonly scopeId: string;
  }[],
) {
  let allowed = false;
  let assigned = false;
  let decidedAt: AuthorizationScopeType = "platform";
  for (const layer of layers) {
    const matching = grants.filter(
      (grant) =>
        grant.permission === permission &&
        grant.scopeType === layer.scopeType &&
        grant.scopeId === layer.scopeId,
    );
    if (matching.some((grant) => grant.effect === "deny")) {
      allowed = false;
      assigned = true;
      decidedAt = layer.scopeType;
      continue;
    }
    if (matching.some((grant) => grant.effect === "allow")) {
      allowed = true;
      assigned = true;
      decidedAt = layer.scopeType;
      continue;
    }
    if (layer.baseline.has(permission)) {
      allowed = true;
      assigned = true;
      decidedAt = layer.scopeType;
    }
  }
  return { allowed, assigned, decidedAt } satisfies {
    readonly allowed: boolean;
    readonly assigned: boolean;
    readonly decidedAt: AuthorizationScopeType;
  };
}

export function uniquePermissions(permissions: readonly Permission[]): readonly Permission[] {
  return [...new Set(permissions)].sort();
}

export function mostSpecificScope(scope: AuthorizationScope): AuthorizationScopeType {
  if (scope.encounterId) return "encounter";
  if (scope.teamId) return "team";
  if (scope.competitionId) return "competition";
  if (scope.organizationId) return "organization";
  return "platform";
}
