import type {
  AuthorizationPort,
  AuthorizationRequest,
  EffectiveAccess,
  Permission,
  ActorId,
  AuthorizationScope,
} from "@futrob/shared-kernel";

/** Breaks composition-time cycles without leaking a service locator into packages. */
export class DeferredAuthorizationPort implements AuthorizationPort {
  private target: AuthorizationPort | null = null;

  bind(target: AuthorizationPort): void {
    if (this.target) throw new Error("AuthorizationPort is already bound");
    this.target = target;
  }

  decide(request: AuthorizationRequest) {
    return this.requireTarget().decide(request);
  }

  getEffectiveAccess(input: {
    readonly actorId: ActorId;
    readonly scope: AuthorizationScope;
    readonly permissions?: readonly Permission[];
  }): Promise<EffectiveAccess> {
    return this.requireTarget().getEffectiveAccess(input);
  }

  private requireTarget(): AuthorizationPort {
    if (!this.target) throw new Error("AuthorizationPort has not been bound");
    return this.target;
  }
}
