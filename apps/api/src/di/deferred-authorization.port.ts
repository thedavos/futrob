import type {
  AuthorizationBatchPort,
  AuthorizationPort,
  AuthorizationRequest,
  EffectiveAccess,
  Permission,
  ActorId,
  AuthorizationScope,
} from "@futrob/shared-kernel";

type AuthorizationTarget = AuthorizationPort & AuthorizationBatchPort;

/** Breaks composition-time cycles without leaking a service locator into packages. */
export class DeferredAuthorizationPort implements AuthorizationPort, AuthorizationBatchPort {
  private target: AuthorizationTarget | null = null;

  bind(target: AuthorizationTarget): void {
    if (this.target) throw new Error("AuthorizationPort is already bound");
    this.target = target;
  }

  decide(request: AuthorizationRequest) {
    return this.requireTarget().decide(request);
  }

  decideEach(input: Parameters<AuthorizationBatchPort["decideEach"]>[0]) {
    return this.requireTarget().decideEach(input);
  }

  getEffectiveAccess(input: {
    readonly actorId: ActorId;
    readonly scope: AuthorizationScope;
    readonly permissions?: readonly Permission[];
  }): Promise<EffectiveAccess> {
    return this.requireTarget().getEffectiveAccess(input);
  }

  private requireTarget(): AuthorizationTarget {
    if (!this.target) throw new Error("AuthorizationPort has not been bound");
    return this.target;
  }
}
