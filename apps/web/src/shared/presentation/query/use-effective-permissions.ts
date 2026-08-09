import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuthorizationScopeDto, PermissionDto } from "@futrob/api-contracts";
import {
  allowedFromCapabilityState,
  capabilityStateFromQuery,
  getEffectiveAccess,
  type CapabilityState,
} from "@/context/permissions.ts";
import { queryKeys } from "./query-keys.ts";

export function useEffectivePermissions(
  scope: AuthorizationScopeDto,
  permissions: readonly PermissionDto[],
) {
  const query = useQuery({
    queryKey: queryKeys.authorization.effectiveAccess(scope, permissions),
    queryFn: () => getEffectiveAccess(scope, permissions),
    staleTime: 30_000,
  });
  const capability: CapabilityState = useMemo(
    () =>
      capabilityStateFromQuery({
        fetchStatus: query.isError ? "error" : query.isPending ? "pending" : "success",
        data: query.data,
      }),
    [query.data, query.isError, query.isPending],
  );
  const allowed = useMemo(() => allowedFromCapabilityState(capability), [capability]);
  return { allowed, capability, query };
}
