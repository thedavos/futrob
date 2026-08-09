import { useMemo } from "react";
import type { AuthorizationScopeDto } from "@futrob/api-contracts";
import type { Permission } from "@futrob/shared-kernel";
import { useEffectivePermissions } from "@/shared/presentation/query/use-effective-permissions.ts";
import { can } from "./can.ts";

export type CanQuery = {
  readonly allowed: boolean;
  readonly loading: boolean;
  readonly unavailable: boolean;
};

export function useCan(scope: AuthorizationScopeDto, permission: Permission): CanQuery {
  const { allowed, capability } = useEffectivePermissions(scope, [permission]);
  return {
    allowed: can(allowed, permission),
    loading: capability.status === "loading",
    unavailable: capability.status === "unavailable",
  };
}

export type CapabilityMap = Readonly<Record<string, Permission>>;

export type CapabilitiesQuery<T extends CapabilityMap> = {
  readonly [K in keyof T]: boolean;
} & {
  readonly loading: boolean;
  readonly unavailable: boolean;
};

export function useCapabilities<T extends CapabilityMap>(
  scope: AuthorizationScopeDto,
  map: T,
): CapabilitiesQuery<T> {
  const permissions = useMemo(() => Object.values(map) as Permission[], [map]);
  const { allowed, capability } = useEffectivePermissions(scope, permissions);
  const flags = useMemo(() => {
    const next = {} as { [K in keyof T]: boolean };
    for (const key of Object.keys(map) as Array<keyof T>) {
      next[key] = can(allowed, map[key]);
    }
    return next;
  }, [allowed, map]);

  return {
    ...flags,
    loading: capability.status === "loading",
    unavailable: capability.status === "unavailable",
  };
}
