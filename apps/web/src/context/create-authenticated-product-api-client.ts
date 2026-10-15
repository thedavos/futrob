import type { RequestId } from "@futrob/api-contracts";
import { parseAppEnv } from "@/config/env.ts";
import {
  createProductApiClient,
  createServiceProductApiClient,
} from "@/context/product-api-client.ts";
import { resolveAuthenticatedRequestActor } from "@/modules/identity/server/authenticated-request-actor.ts";
import { getWorkerBindings } from "@/modules/identity/server/worker-bindings.ts";
import { createBffRequestCorrelation } from "@/shared/infrastructure/http/request-correlation.ts";

export {
  classifyProductApiBffError,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/product-api-bff-error-response.ts";

export class ProductApiBffMisconfiguredError extends Error {
  readonly code = "product_api.bff_misconfigured" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProductApiBffMisconfiguredError";
  }
}

async function resolveServiceConfig() {
  const bindings = await getWorkerBindings();
  const appEnv = parseAppEnv({
    APP_BASE_URL: bindings.APP_BASE_URL ?? process.env.APP_BASE_URL,
    BETTER_AUTH_SECRET: bindings.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: bindings.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL,
    BETTER_AUTH_TRUSTED_ORIGINS:
      bindings.BETTER_AUTH_TRUSTED_ORIGINS ?? process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    EA_CLUBS_BASE_URL: process.env.EA_CLUBS_BASE_URL,
    INTERNAL_JOB_SECRET: bindings.INTERNAL_JOB_SECRET ?? process.env.INTERNAL_JOB_SECRET,
  });

  if (!appEnv.INTERNAL_JOB_SECRET) {
    throw new ProductApiBffMisconfiguredError("INTERNAL_JOB_SECRET is required");
  }
  return { bindings, internalJobSecret: appEnv.INTERNAL_JOB_SECRET };
}

export async function createAuthenticatedProductApiClient(request: Request, requestId?: RequestId) {
  const resolvedRequestId = requestId ?? createBffRequestCorrelation(request).requestId;
  const { bindings, internalJobSecret } = await resolveServiceConfig();

  const actorId = await resolveAuthenticatedRequestActor({
    authService: bindings.AUTH_SERVICE,
    request,
  });
  const client = createProductApiClient({
    actorId,
    internalJobSecret,
    requestId: resolvedRequestId,
    baseUrl: bindings.FUTROB_API_BASE_URL,
  });

  return { client, actorId, requestId: resolvedRequestId };
}

/** Product API client for a signed-out request: the service secret, without an actor. */
export async function createAnonymousProductApiClient(request: Request) {
  const requestId = createBffRequestCorrelation(request).requestId;
  const { bindings, internalJobSecret } = await resolveServiceConfig();
  const client = createServiceProductApiClient({
    internalJobSecret,
    requestId,
    baseUrl: bindings.FUTROB_API_BASE_URL,
  });
  return { client, requestId };
}
