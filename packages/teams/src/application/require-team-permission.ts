import type {
  ActorId,
  AuthorizationPort,
  AuthorizationScope,
  Permission,
} from "@futrob/shared-kernel";
import { TeamAuthorizationForbidden } from "../domain/errors/team.errors.ts";

export async function teamPermissionError(input: {
  readonly authorization: AuthorizationPort;
  readonly actorId: ActorId;
  readonly permission: Permission;
  readonly scope: AuthorizationScope;
}): Promise<TeamAuthorizationForbidden | null> {
  const decision = await input.authorization.decide({
    actorId: input.actorId,
    permission: input.permission,
    scope: input.scope,
  });
  if (decision.allowed) return null;
  return new TeamAuthorizationForbidden({
    code: "authorization.forbidden",
    message: "The actor cannot perform this team operation",
    permission: input.permission,
  });
}
