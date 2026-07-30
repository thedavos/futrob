import type { ActorId } from "@futrob/shared-kernel";
import { FutrobApiError } from "@futrob/sdk";
import { parseAppEnv } from "@/config/env.ts";
import { AuthUnauthenticatedError, requireAuthenticatedActor } from "@/context/auth.ts";
import { createProductApiClient } from "@/context/product-api-client.ts";
import { createAuth, createAuthDb } from "@/modules/identity/adapters/auth/better-auth.ts";
import { createD1ActorProvisioner } from "@/modules/identity/adapters/auth/actor-provisioner.ts";
import { createSessionIdentityAdapter } from "@/modules/identity/adapters/auth/session-identity.adapter.ts";
import { getWorkerEnv } from "@/modules/identity/adapters/auth/worker-env.ts";
import { CryptoIdGenerator } from "@/shared/application/id-generator.ts";
import { apiErrorResponse } from "@/shared/infrastructure/http/api-response.ts";

export class ProductApiBffMisconfiguredError extends Error {
  readonly code = "product_api.bff_misconfigured" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProductApiBffMisconfiguredError";
  }
}

export async function createAuthenticatedProductApiClient(request: Request) {
  const bindings = getWorkerEnv();
  if (!bindings.APP_DB) {
    throw new ProductApiBffMisconfiguredError("APP_DB binding is required");
  }

  const appEnv = parseAppEnv({
    APP_BASE_URL: bindings.APP_BASE_URL ?? process.env.APP_BASE_URL,
    BETTER_AUTH_SECRET: bindings.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: bindings.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL,
    BETTER_AUTH_TRUSTED_ORIGINS:
      bindings.BETTER_AUTH_TRUSTED_ORIGINS ?? process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    EA_CLUBS_BASE_URL: process.env.EA_CLUBS_BASE_URL,
    INTERNAL_JOB_SECRET: process.env.INTERNAL_JOB_SECRET,
  });

  if (!appEnv.INTERNAL_JOB_SECRET) {
    throw new ProductApiBffMisconfiguredError("INTERNAL_JOB_SECRET is required");
  }

  const ids = new CryptoIdGenerator();
  const db = createAuthDb(bindings.APP_DB);
  const actorProvisioner = createD1ActorProvisioner({ db, ids });
  const auth = createAuth({
    d1: bindings.APP_DB,
    env: appEnv,
    ids,
    actorProvisioner,
  });
  const sessionIdentity = createSessionIdentityAdapter({
    auth,
    actorProvisioner,
  });

  const actorId: ActorId = await requireAuthenticatedActor(sessionIdentity, request.headers);
  const client = createProductApiClient({
    actorId,
    internalJobSecret: appEnv.INTERNAL_JOB_SECRET,
  });

  return { client, actorId };
}

export function productApiBffErrorResponse(error: unknown): Response {
  if (error instanceof ProductApiBffMisconfiguredError) {
    return apiErrorResponse(503, {
      code: error.code,
      messageKey: "errors.product_api.bff_misconfigured",
    });
  }

  if (error instanceof AuthUnauthenticatedError) {
    return apiErrorResponse(401, {
      code: "auth.unauthenticated",
      messageKey: "errors.auth.unauthenticated",
    });
  }

  if (error instanceof FutrobApiError) {
    return apiErrorResponse(error.status, {
      code: error.code,
      messageKey: error.messageKey,
      details: error.details,
      requestId: error.requestId,
    });
  }

  throw error;
}
