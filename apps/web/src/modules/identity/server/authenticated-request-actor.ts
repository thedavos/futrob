import type { AppEnv } from "@/config/env.ts";
import type { AppD1Database } from "@/shared/infrastructure/d1.ts";

import { credentialSubject, findActorIdForSubject } from "../adapters/auth/actor-provisioner.ts";
import { createAuth, createAuthDb } from "../adapters/auth/better-auth.ts";
import { createSessionIdentityAdapter } from "../adapters/auth/session-identity.adapter.ts";
import { requireAuthenticatedActor } from "./session-auth.ts";

/** Compose identity-owned adapters for one authenticated server request. */
export async function resolveAuthenticatedRequestActor(input: {
  readonly d1: AppD1Database;
  readonly env: AppEnv;
  readonly headers: Headers;
}) {
  const db = createAuthDb(input.d1);
  const auth = createAuth({
    d1: input.d1,
    env: input.env,
  });
  const sessionIdentity = createSessionIdentityAdapter({
    auth,
    findActorId: (userId) => findActorIdForSubject(db, credentialSubject(userId)),
  });
  return requireAuthenticatedActor(sessionIdentity, input.headers);
}
