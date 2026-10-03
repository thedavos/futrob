import { asActorId } from "@futrob/shared-kernel";
import { AuthServiceMisconfiguredError, AuthUnauthenticatedError } from "./auth-errors.ts";
import { fetchAuthSessionActorId, type AuthServiceBinding } from "./auth-proxy.ts";

/**
 * Resolve the authenticated Futrob actor for one server request.
 * `apps/auth` provisions actors and returns `actorId` from `get-session` (ADR-0021);
 * web never reads identity tables.
 */
export async function resolveAuthenticatedRequestActor(input: {
  readonly authService: AuthServiceBinding | undefined;
  readonly request: Request;
}) {
  if (!input.authService) {
    throw new AuthServiceMisconfiguredError({
      code: "auth.misconfigured",
      message: "AUTH_SERVICE binding is required",
    });
  }

  const actorId = await fetchAuthSessionActorId(input.request, input.authService);
  if (!actorId) {
    throw new AuthUnauthenticatedError();
  }
  return asActorId(actorId);
}
