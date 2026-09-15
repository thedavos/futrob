import type { EffectiveAccessDto, PermissionDto } from "@futrob/api-contracts";

/** DTO permission strings — not @futrob/organizations (AC-MOB-003). */
export const MOBILE_PERMISSION = {
  organizationsRead: "organizations.read",
} as const satisfies Record<string, PermissionDto>;

export class EffectiveAccessHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`effective-access:${status}`);
    this.name = "EffectiveAccessHttpError";
    this.status = status;
  }
}

export type CapabilityState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly allowed: ReadonlySet<string> }
  | { readonly status: "unavailable" };

export interface PermissionGatedItem {
  readonly id: string;
  readonly requiredPermission?: PermissionDto;
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

export function filterByPermission<T extends PermissionGatedItem>(
  items: readonly T[],
  allowedPermissions: ReadonlySet<string> | undefined,
): readonly T[] {
  if (!allowedPermissions) return items;
  return items.filter(
    (item) => !item.requiredPermission || allowedPermissions.has(item.requiredPermission),
  );
}

/** Fail-closed org tab catalog. No shell is wired until a real navigator exists. */
export const ORG_TABS = [
  { id: "home", requiredPermission: MOBILE_PERMISSION.organizationsRead },
] as const satisfies readonly PermissionGatedItem[];

export function orgTabsForAccess(
  allowedPermissions: ReadonlySet<string>,
): readonly { id: string }[] {
  return filterByPermission(ORG_TABS, allowedPermissions);
}
