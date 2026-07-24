import { createAppContext } from "@/bootstrap/create-app-context.ts";
import { createRequestContext, type RequestContext } from "@/bootstrap/create-request-context.ts";
import { asActorId, asOrganizationId } from "@/shared/domain/identifiers.ts";

/** Builds request-scoped modules for private API handlers (auth optional in MVP). */
export function createApiRequestContext(fetcher: typeof fetch = fetch): RequestContext {
  const envVars: Record<string, string | undefined> = {
    APP_BASE_URL: typeof process !== "undefined" ? process.env.APP_BASE_URL : undefined,
    BETTER_AUTH_SECRET: typeof process !== "undefined" ? process.env.BETTER_AUTH_SECRET : undefined,
    BETTER_AUTH_URL: typeof process !== "undefined" ? process.env.BETTER_AUTH_URL : undefined,
    BETTER_AUTH_TRUSTED_ORIGINS:
      typeof process !== "undefined" ? process.env.BETTER_AUTH_TRUSTED_ORIGINS : undefined,
    EA_CLUBS_BASE_URL: typeof process !== "undefined" ? process.env.EA_CLUBS_BASE_URL : undefined,
    INTERNAL_JOB_SECRET:
      typeof process !== "undefined" ? process.env.INTERNAL_JOB_SECRET : undefined,
  };

  const app = createAppContext({
    envVars,
    bindings: {
      APP_DB: undefined,
      MEDIA_BUCKET: undefined,
      JOB_QUEUE: undefined,
    },
  });

  return createRequestContext({
    app,
    identity: {
      actorId: asActorId("anonymous"),
      organizationId: asOrganizationId("anonymous"),
    },
    fetcher,
  });
}
