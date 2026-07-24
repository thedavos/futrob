import type { SessionIdentityPort, RequestHeaders } from "@futrob/identity";
import type { ActorId } from "@futrob/shared-kernel";
import {
  AuthUnauthenticatedError,
  resolveSessionActorId,
} from "@/modules/identity/adapters/auth/session-identity.adapter.ts";

export { AuthUnauthenticatedError };

/**
 * Resolve Better Auth session cookies → Futrob ActorId.
 * Call from server handlers / server functions with the request Headers.
 */
export async function requireAuthenticatedActor(
  port: SessionIdentityPort,
  headers: RequestHeaders,
): Promise<ActorId> {
  return resolveSessionActorId(port, headers);
}
