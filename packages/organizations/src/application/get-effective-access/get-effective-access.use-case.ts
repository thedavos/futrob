import type {
  ActorId,
  AuthorizationPort,
  AuthorizationScope,
  EffectiveAccess,
  Permission,
} from "@futrob/shared-kernel";

export interface GetEffectiveAccessInput {
  readonly actorId: ActorId;
  readonly scope: AuthorizationScope;
  readonly permissions?: readonly Permission[];
}

export class GetEffectiveAccessUseCase {
  constructor(private readonly authorization: AuthorizationPort) {}

  execute(input: GetEffectiveAccessInput): Promise<EffectiveAccess> {
    return this.authorization.getEffectiveAccess(input);
  }
}
