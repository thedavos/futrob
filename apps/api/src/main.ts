import { serve } from "@hono/node-server";
import { createPostgresHealth, createPostgresPool } from "@/adapters/persistence/postgres.ts";
import { createApp } from "@/app.ts";
import { loadEnv } from "@/config/env.ts";
import { consoleCorrelationLogger } from "@/context/request-correlation.ts";
import {
  apiConsoleLogger,
  shouldUseJsonLogs,
  styledConsoleCorrelationLogger,
} from "@/context/styled-console-logger.ts";
import { createModules } from "@/di/create-modules.ts";
import { initSentry, registerGlobalSentryHandlers } from "@/observability/sentry.ts";
import { loadDotEnvFile } from "@/utils/load-dotenv.ts";
import { asActorId } from "@futrob/shared-kernel";
import { z } from "zod";

const postgresErrorCodeSchema = z.object({ code: z.string() });
const FOREIGN_KEY_VIOLATION = "23503";

loadDotEnvFile();

const env = loadEnv();
initSentry(env);
registerGlobalSentryHandlers();
const pool = createPostgresPool(env.databaseUrl);
const dbHealth = createPostgresHealth(pool);

const modules = createModules({
  fetcher: fetch,
  eaClubsBaseUrl: env.eaClubsBaseUrl,
  pool,
  resultsSystemActorId: env.resultsSystemActorId,
});
if (env.initialSuperuserActorId) {
  try {
    await modules.authorization.bootstrapInitialSuperuser(asActorId(env.initialSuperuserActorId));
  } catch (error) {
    // Actors are provisioned by apps/auth on first sign-in (ADR-0021), so the
    // configured id may not exist yet. Start anyway; the bootstrap retries on the next boot.
    const postgresError = postgresErrorCodeSchema.safeParse(error);
    if (!postgresError.success || postgresError.data.code !== FOREIGN_KEY_VIOLATION) throw error;
    apiConsoleLogger.warn("authorization.initial_superuser.actor_missing", {
      actorId: env.initialSuperuserActorId,
    });
  }
}

const app = createApp({
  modules,
  checkDbHealth: () => dbHealth.check(),
  internalJobSecret: env.internalJobSecret,
  correlationLogger: shouldUseJsonLogs()
    ? consoleCorrelationLogger
    : styledConsoleCorrelationLogger,
});

const server = serve({ fetch: app.fetch, port: env.port }, (info) => {
  apiConsoleLogger.info("server.listening", {
    url: `http://localhost:${info.port}/api/v1`,
  });
});

const shutdown = (): void => {
  server.close();
  void dbHealth.close();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
