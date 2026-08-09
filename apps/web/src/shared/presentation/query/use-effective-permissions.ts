import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuthorizationScopeDto, PermissionDto } from "@futrob/api-contracts";
import { allowedPermissionSet, getEffectiveAccess } from "@/context/permissions.ts";
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
  const allowed = useMemo(() => allowedPermissionSet(query.data), [query.data]);
  return { allowed, query };
}
