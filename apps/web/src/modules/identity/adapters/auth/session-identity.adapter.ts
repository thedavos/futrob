import type { SessionIdentityPort, RequestHeaders } from "@futrob/identity";
import { asActorId, type ActorId } from "@futrob/shared-kernel";

/** Narrow surface so memory-adapter test auth and D1 auth share the same adapter. */
export interface AuthSessionApi {
  readonly api: {
    getSession(input: { headers: RequestHeaders }): Promise<{ user: { id: string } } | null>;
  };
}

export function createSessionIdentityAdapter(input: {
  readonly auth: AuthSessionApi;
  readonly findActorId: (subject: string) => Promise<ActorId | null>;
}): SessionIdentityPort {
  return {
    async resolveActorId(headers) {
      const session = await input.auth.api.getSession({ headers });
      if (!session?.user?.id) {
        return null;
      }

      return input.findActorId(session.user.id);
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
