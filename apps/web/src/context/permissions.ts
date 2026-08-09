import {
  effectiveAccessSchema,
  type AuthorizationScopeDto,
  type EffectiveAccessDto,
  type PermissionDto,
} from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { TEAM_PERMISSION } from "@futrob/teams";

/** Shell bootstrap probes — BC permission constants, not string literals. */
export const SHELL_PERMISSIONS = [
  ORGANIZATION_PERMISSION.read,
  ORGANIZATION_PERMISSION.update,
  ORGANIZATION_PERMISSION.membershipsRead,
  ORGANIZATION_PERMISSION.invitationsManage,
  ORGANIZATION_PERMISSION.rolesManage,
  COMPETITION_PERMISSION.read,
  COMPETITION_PERMISSION.update,
  COMPETITION_PERMISSION.publish,
  COMPETITION_PERMISSION.participantsRead,
  TEAM_PERMISSION.read,
  TEAM_PERMISSION.create,
  TEAM_PERMISSION.rosterRead,
  TEAM_PERMISSION.rosterManage,
  TEAM_PERMISSION.rosterRolesManage,
  TEAM_PERMISSION.invitationsManage,
  TEAM_PERMISSION.externalClubRead,
  TEAM_PERMISSION.externalClubManage,
] as const satisfies readonly PermissionDto[];

export class EffectiveAccessHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`effective-access:${status}`);
    this.name = "EffectiveAccessHttpError";
    this.status = status;
  }
}

/** Fail-closed view of server-resolved capabilities for presentation only. */
export type CapabilityState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly allowed: ReadonlySet<string> }
  | { readonly status: "unavailable" };

export function allowedPermissionSet(
  access: EffectiveAccessDto | null | undefined,
): ReadonlySet<string> {
  return new Set(
    access?.permissions
      .filter((permission) => permission.allowed)
      .map((permission) => permission.permission) ?? [],
  );
}

/**
 * Derive UI capabilities from a query snapshot.
 * Loading without data and any error (including 403) hide privileged actions.
 * Stale success data is ignored once the query is in error so revocation/403 cannot keep actions visible.
 */
export function capabilityStateFromQuery(input: {
  readonly fetchStatus: "pending" | "error" | "success";
  readonly data: EffectiveAccessDto | undefined;
}): CapabilityState {
  if (input.fetchStatus === "error") return { status: "unavailable" };
  if (input.fetchStatus === "pending" && input.data === undefined) return { status: "loading" };
  return { status: "ready", allowed: allowedPermissionSet(input.data) };
}

export function allowedFromCapabilityState(state: CapabilityState): ReadonlySet<string> {
  return state.status === "ready" ? state.allowed : new Set();
}

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
  if (!response.ok) throw new EffectiveAccessHttpError(response.status);
  return effectiveAccessSchema.parse(await response.json());
}
