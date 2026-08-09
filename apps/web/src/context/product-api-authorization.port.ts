import type {
  ActorId,
  AuthorizationDecision,
  AuthorizationPort,
  AuthorizationRequest,
  EffectiveAccess,
  Permission,
} from "@futrob/shared-kernel";
import type { FutrobClient } from "@futrob/sdk";

/** Server-side bridge; policy resolution remains owned by apps/api. */
export class ProductApiAuthorizationPort implements AuthorizationPort {
  constructor(
    private readonly actorId: ActorId,
    private readonly client: FutrobClient,
  ) {}

  async decide(request: AuthorizationRequest): Promise<AuthorizationDecision> {
    if (request.actorId !== this.actorId) {
      return { ...request, allowed: false, reason: "scope-mismatch" };
    }
    const access = await this.getEffectiveAccess({
      actorId: request.actorId,
      scope: request.scope,
      permissions: [request.permission],
    });
    const permission = access.permissions[0];
    return {
      ...request,
      allowed: permission?.allowed ?? false,
      reason: permission?.allowed ? "allowed" : "no-assignment",
    };
  }

  async getEffectiveAccess(
    input: Parameters<AuthorizationPort["getEffectiveAccess"]>[0],
  ): Promise<EffectiveAccess> {
    if (input.actorId !== this.actorId) {
      return { actorId: input.actorId, scope: input.scope, roles: [], permissions: [] };
    }
    const access = await this.client.authorization.getEffectiveAccess(
      input.scope,
      input.permissions,
    );
    return {
      actorId: input.actorId,
      scope: input.scope,
      roles: access.roles,
      permissions: access.permissions.map((item) => ({
        ...item,
        permission: item.permission as Permission,
      })),
    };
  }
}
