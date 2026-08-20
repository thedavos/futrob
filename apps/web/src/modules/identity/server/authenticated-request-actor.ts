import type { IdGeneratorPort } from "@futrob/shared-kernel";
import type { AppEnv } from "@/config/env.ts";
import type { AppD1Database } from "@/shared/infrastructure/d1.ts";

import { createD1ActorProvisioner } from "../adapters/auth/actor-provisioner.ts";
import { createAuth, createAuthDb } from "../adapters/auth/better-auth.ts";
import { createSessionIdentityAdapter } from "../adapters/auth/session-identity.adapter.ts";
import { requireAuthenticatedActor } from "./session-auth.ts";

/** Compose identity-owned adapters for one authenticated server request. */
export async function resolveAuthenticatedRequestActor(input: {
  readonly d1: AppD1Database;
  readonly env: AppEnv;
  readonly headers: Headers;
  readonly ids: IdGeneratorPort;
}) {
  const db = createAuthDb(input.d1);
  const actorProvisioner = createD1ActorProvisioner({ db, ids: input.ids });
  const auth = createAuth({
    d1: input.d1,
    env: input.env,
    ids: input.ids,
    actorProvisioner,
  });
  const sessionIdentity = createSessionIdentityAdapter({
    auth,
    actorProvisioner,
  });
  return requireAuthenticatedActor(sessionIdentity, input.headers);
}
