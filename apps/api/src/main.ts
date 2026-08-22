import { serve } from "@hono/node-server";
import { createPostgresHealth, createPostgresPool } from "@/adapters/persistence/postgres.ts";
import { createApp } from "@/app.ts";
import { loadEnv } from "@/config/env.ts";
import { consoleCorrelationLogger } from "@/context/request-correlation.ts";
import {
  shouldUseJsonLogs,
  styledConsoleCorrelationLogger,
} from "@/context/styled-console-logger.ts";
import { createModules } from "@/di/create-modules.ts";
import { initSentry, registerGlobalSentryHandlers } from "@/observability/sentry.ts";
import { loadDotEnvFile } from "@/utils/load-dotenv.ts";
import { asActorId } from "@futrob/shared-kernel";

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
});
if (env.initialSuperuserActorId) {
  await modules.authorization.bootstrapInitialSuperuser(asActorId(env.initialSuperuserActorId));
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
  console.log(`futrob api listening on http://localhost:${info.port}/api/v1`);
});

const shutdown = (): void => {
  server.close();
  void dbHealth.close();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
