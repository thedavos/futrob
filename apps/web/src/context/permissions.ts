import {
  effectiveAccessSchema,
  type AuthorizationScopeDto,
  type EffectiveAccessDto,
  type PermissionDto,
} from "@futrob/api-contracts";

export const SHELL_PERMISSIONS = [
  "organizations.read",
  "organizations.update",
  "organizations.memberships.read",
  "organizations.invitations.manage",
  "authorization.roles.manage",
  "competitions.read",
  "competitions.update",
  "competitions.publish",
  "competitions.participants.read",
  "teams.read",
  "teams.create",
  "teams.roster.read",
] as const satisfies readonly PermissionDto[];

export async function getEffectiveAccess(
  scope: AuthorizationScopeDto,
  permissions: readonly PermissionDto[] = SHELL_PERMISSIONS,
): Promise<EffectiveAccessDto> {
  const query = new URLSearchParams();
  if (scope.organizationId) query.set("organizationId", scope.organizationId);
  if (scope.competitionId) query.set("competitionId", scope.competitionId);
  if (scope.teamId) query.set("teamId", scope.teamId);
  if (scope.encounterId) query.set("encounterId", scope.encounterId);
  if (permissions.length) query.set("permissions", permissions.join(","));
  const response = await fetch(`/api/v1/authorization/effective-access?${query.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`effective-access:${response.status}`);
  return effectiveAccessSchema.parse(await response.json());
}

export function allowedPermissionSet(
  access: EffectiveAccessDto | null | undefined,
): ReadonlySet<string> {
  return new Set(
    access?.permissions
      .filter((permission) => permission.allowed)
      .map((permission) => permission.permission) ?? [],
  );
}
