import type { ActorProvisionerPort, RequestHeaders, SessionIdentityPort } from "@futrob/identity";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import { credentialSubject } from "./actor-provisioner.ts";

/** Narrow surface so memory-adapter test auth and D1 auth share the same adapter. */
export interface AuthSessionApi {
  readonly api: {
    getSession(input: { headers: Headers }): Promise<{ user: { id: string } } | null>;
  };
}

export function createSessionIdentityAdapter(input: {
  readonly auth: AuthSessionApi;
  readonly actorProvisioner: ActorProvisionerPort;
}): SessionIdentityPort {
  return {
    async resolveActorId(headers) {
      const session = await input.auth.api.getSession({
        headers: headers as Headers,
      });
      if (!session?.user?.id) {
        return null;
      }

      return input.actorProvisioner.ensureActorForSubject(credentialSubject(session.user.id));
    },
  };
}

export async function resolveSessionActorId(
  port: SessionIdentityPort,
  headers: RequestHeaders,
): Promise<ActorId> {
  const actorId = await port.resolveActorId(headers);
  if (!actorId) {
    throw new AuthUnauthenticatedError();
  }
  return asActorId(actorId);
}

export class AuthUnauthenticatedError extends Error {
  readonly code = "auth.unauthenticated" as const;

  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthUnauthenticatedError";
  }
}
