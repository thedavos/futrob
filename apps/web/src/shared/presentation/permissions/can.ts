import type { Permission } from "@futrob/shared-kernel";

/** Pure check against a server-resolved allowed set. Fail-closed when absent. */
export function can(allowed: ReadonlySet<string>, permission: Permission): boolean {
  return allowed.has(permission);
}

export function canAny(allowed: ReadonlySet<string>, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => allowed.has(permission));
}

export function canAll(allowed: ReadonlySet<string>, permissions: readonly Permission[]): boolean {
  return permissions.every((permission) => allowed.has(permission));
}
