import type { RequestHeaders, SessionIdentityPort } from "@futrob/identity";
import type { ActorId } from "@futrob/shared-kernel";

import {
  AuthUnauthenticatedError,
  resolveSessionActorId,
} from "../adapters/auth/session-identity.adapter.ts";

export { AuthUnauthenticatedError };

/** Resolve Better Auth session cookies to the authenticated Futrob actor. */
export async function requireAuthenticatedActor(
  port: SessionIdentityPort,
  headers: RequestHeaders,
): Promise<ActorId> {
  return resolveSessionActorId(port, headers);
}
