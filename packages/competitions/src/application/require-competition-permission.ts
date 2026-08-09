import type {
  ActorId,
  AuthorizationPort,
  AuthorizationScope,
  Permission,
} from "@futrob/shared-kernel";
import { CompetitionAuthorizationForbidden } from "../domain/errors/competition.errors.ts";

export async function competitionPermissionError(input: {
  readonly authorization: AuthorizationPort;
  readonly actorId: ActorId;
  readonly permission: Permission;
  readonly scope: AuthorizationScope;
}): Promise<CompetitionAuthorizationForbidden | null> {
  const decision = await input.authorization.decide({
    actorId: input.actorId,
    permission: input.permission,
    scope: input.scope,
  });
  if (decision.allowed) return null;
  return new CompetitionAuthorizationForbidden({
    code: "authorization.forbidden",
    message: "The actor cannot perform this competition operation",
    permission: input.permission,
  });
}
