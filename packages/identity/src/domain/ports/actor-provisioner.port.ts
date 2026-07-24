import type { ActorId } from "@futrob/shared-kernel";
import type { IdentityProviderKey } from "../value-objects/identity-provider.ts";

/** Idempotent mapping from an auth provider subject to a stable ActorId. */
export interface ActorProvisionerPort {
  ensureActorForSubject(input: {
    readonly provider: IdentityProviderKey;
    readonly subject: string;
  }): Promise<ActorId>;
}
