import { cors } from "hono/cors";
import { Hono } from "hono";
import type { DbHealthStatus } from "@/adapters/persistence/postgres.ts";
import type { AppModules } from "@/di/create-modules.ts";
import { registerGameDataClubRoutes } from "@/http/routes/game-data-clubs.ts";
import { registerMetaRoutes } from "@/http/routes/meta.ts";
import { registerOpenApiRoutes } from "@/http/routes/openapi.ts";
import { registerOrganizationRoutes } from "@/http/routes/organizations.ts";

export interface AppDeps {
  readonly modules: AppModules;
  readonly checkDbHealth: () => Promise<DbHealthStatus>;
  readonly internalJobSecret: string;
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
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Accept", "Authorization", "Content-Type", "X-Futrob-Actor-Id"],
    }),
  );

  const v1 = new Hono();

  registerMetaRoutes(v1, deps);
  registerOpenApiRoutes(v1);
  registerGameDataClubRoutes(v1, deps);
  registerOrganizationRoutes(v1, deps);

  app.route("/api/v1", v1);

  return app;
}
