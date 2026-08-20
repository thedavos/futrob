import { createAppContext } from "@/bootstrap/create-app-context.ts";
import { createRequestContext, type RequestContext } from "@/bootstrap/create-request-context.ts";
import { asActorId, asOrganizationId } from "@/shared/domain/identifiers.ts";
import { readNodeEnv } from "@/shared/infrastructure/node-env.ts";

const API_REQUEST_ENV_KEYS = [
  "APP_BASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "EA_CLUBS_BASE_URL",
  "INTERNAL_JOB_SECRET",
] as const;

/** Builds request-scoped modules for private API handlers (auth optional in MVP). */
export function createApiRequestContext(fetcher: typeof fetch = fetch): RequestContext {
  const envVars = {
    APP_BASE_URL: readNodeEnv("APP_BASE_URL"),
    BETTER_AUTH_SECRET: readNodeEnv("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: readNodeEnv("BETTER_AUTH_URL"),
    BETTER_AUTH_TRUSTED_ORIGINS: readNodeEnv("BETTER_AUTH_TRUSTED_ORIGINS"),
    EA_CLUBS_BASE_URL: readNodeEnv("EA_CLUBS_BASE_URL"),
    INTERNAL_JOB_SECRET: readNodeEnv("INTERNAL_JOB_SECRET"),
  } satisfies Record<(typeof API_REQUEST_ENV_KEYS)[number], string | undefined>;

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
