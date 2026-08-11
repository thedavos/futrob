import { cors } from "hono/cors";
import { Hono } from "hono";
import { REQUEST_ID_HEADER } from "@futrob/api-contracts";
import type { DbHealthStatus } from "@/adapters/persistence/postgres.ts";
import { logCorrelatedError, type CorrelationLogger } from "@/context/request-correlation.ts";
import type { AppModules } from "@/di/create-modules.ts";
import { apiErrorResponse } from "@/http/errors.ts";
import { createRequestCorrelationMiddleware } from "@/http/middleware/request-correlation.ts";
import { registerGameDataClubRoutes } from "@/http/routes/game-data-clubs.ts";
import { registerCompetitionRoutes } from "@/http/routes/competitions.ts";
import { registerMetaRoutes } from "@/http/routes/meta.ts";
import { registerOnboardingRoutes } from "@/http/routes/onboarding.ts";
import { registerOpenApiRoutes } from "@/http/routes/openapi.ts";
import { registerOrganizationRoutes } from "@/http/routes/organizations.ts";
import { registerPlayerRoutes } from "@/http/routes/players.ts";
import { registerTeamRoutes } from "@/http/routes/teams.ts";
import { registerAuthorizationRoutes } from "@/http/routes/authorization.ts";
import { registerEncounterRoutes } from "@/http/routes/encounters.ts";

export interface AppDeps {
  readonly modules: AppModules;
  readonly checkDbHealth: () => Promise<DbHealthStatus>;
  readonly internalJobSecret: string;
  readonly correlationLogger: CorrelationLogger;
}

const DEFAULT_CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"] as const;

function resolveCorsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return fromEnv && fromEnv.length > 0 ? fromEnv : [...DEFAULT_CORS_ORIGINS];
}

/** Builds the Hono app. All `/api/v1` routes hang off a nested router. */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  const allowedOrigins = new Set(resolveCorsOrigins());

  app.use(
    "/api/v1/*",
    cors({
      origin: (origin) => (origin && allowedOrigins.has(origin) ? origin : null),
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: [
        "Accept",
        "Authorization",
        "Content-Type",
        "X-Futrob-Actor-Id",
        REQUEST_ID_HEADER,
      ],
      exposeHeaders: [REQUEST_ID_HEADER],
    }),
  );
  app.use("/api/v1/*", createRequestCorrelationMiddleware(deps.correlationLogger));

  app.onError((error) => {
    logCorrelatedError("http.request.failed", { errorName: error.name });
    return apiErrorResponse(500, {
      code: "api.unexpected_error",
      messageKey: "errors.api.unexpected_error",
    });
  });

  const v1 = new Hono();

  registerMetaRoutes(v1, deps);
  registerOpenApiRoutes(v1);
  registerGameDataClubRoutes(v1, deps);
  registerCompetitionRoutes(v1, deps);
  registerOnboardingRoutes(v1, deps);
  registerOrganizationRoutes(v1, deps);
  registerPlayerRoutes(v1, deps);
  registerTeamRoutes(v1, deps);
  registerAuthorizationRoutes(v1, deps);
  registerEncounterRoutes(v1, deps);

  app.route("/api/v1", v1);

  return app;
}
