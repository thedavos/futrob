import type { ActorId, AuthorizationScope, Permission } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "./errors.ts";

/** Route boundary helper; the authorization decision itself is an application use case. */
export async function requireApiPermission(
  deps: AppDeps,
  input: {
    readonly actorId: ActorId;
    readonly permission: Permission;
    readonly scope: AuthorizationScope;
  },
): Promise<Response | null> {
  const result = await deps.modules.authorization.requirePermission.execute(input);
  return result.isOk() ? null : failureToHttp(result.error);
}
