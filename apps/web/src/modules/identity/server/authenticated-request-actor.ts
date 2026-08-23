import type { AppD1Database } from "@/shared/infrastructure/d1.ts";
import { retryTransientD1 } from "@/shared/infrastructure/d1-transient.ts";

import { credentialSubject, findActorIdForSubject } from "../adapters/auth/actor-provisioner.ts";
import { createAuthDb } from "../adapters/auth/better-auth.ts";
import { createSessionIdentityAdapter } from "../adapters/auth/session-identity.adapter.ts";
import { AuthServiceMisconfiguredError } from "./auth-errors.ts";
import { fetchAuthSessionUserId, type AuthServiceBinding } from "./auth-proxy.ts";
import { requireAuthenticatedActor } from "./session-auth.ts";

/** Compose identity-owned adapters for one authenticated server request. */
export async function resolveAuthenticatedRequestActor(input: {
  readonly d1: AppD1Database;
  readonly authService: AuthServiceBinding | undefined;
  readonly request: Request;
}) {
  if (!input.authService) {
    throw new AuthServiceMisconfiguredError({
      code: "auth.misconfigured",
      message: "AUTH_SERVICE binding is required",
    });
  }

  const db = createAuthDb(input.d1);
  const authService = input.authService;
  const sessionIdentity = createSessionIdentityAdapter({
    auth: {
      api: {
        getSession: async () => {
          const userId = await fetchAuthSessionUserId(input.request, authService);
          return userId ? { user: { id: userId } } : null;
        },
      },
    },
    findActorId: (userId) =>
      retryTransientD1(() => findActorIdForSubject(db, credentialSubject(userId))),
  });
  return requireAuthenticatedActor(sessionIdentity, input.request.headers);
}
