import { useQuery } from "@tanstack/react-query";
import { FutrobApiError, type WorkspaceContext } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { allowedPermissionSet, SHELL_PERMISSIONS } from "@/modules/authorization/permissions";
import { onProductUnauthorized } from "@/modules/identity/session-lifecycle";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";

function scopeOf(context: WorkspaceContext) {
  if (context.kind === "organization") return { organizationId: context.organizationId };
  if (context.kind === "competition") {
    return { organizationId: context.organizationId, competitionId: context.competitionId };
  }
  return {};
}

/**
 * `EffectiveAccess` for the context's scope, as a permission set. `undefined` while unknown or
 * after a failure: gated navigation stays hidden until the server allows it.
 */
export function useContextAccess(context: WorkspaceContext): ReadonlySet<string> | undefined {
  return useContextAccessQuery(context).data;
}

/** The access query itself, for screens that must tell «checking» from «could not check». */
export function useContextAccessQuery(context: WorkspaceContext) {
  const generation = useSessionGeneration();
  const scope = scopeOf(context);
  return useQuery({
    queryKey: mobileQueryKeys.contextAccess(generation, scope),
    queryFn: async ({ signal }) => {
      try {
        const access = await getFutrobClient().authorization.getEffectiveAccess(
          scope,
          SHELL_PERMISSIONS,
          { signal },
        );
        return allowedPermissionSet(access);
      } catch (error) {
        if (error instanceof FutrobApiError && error.status === 401) {
          await onProductUnauthorized(() => undefined);
        }
        throw error;
      }
    },
    enabled: context.kind !== "personal",
    retry: false,
  });
}
