import { existsSync } from "node:fs";
import { serve } from "@hono/node-server";
import { createConsoleLogger } from "@futrob/logger";
import { createAuth } from "./adapters/auth/better-auth.ts";
import { createAuthDb, createAuthPool } from "./adapters/auth/database.ts";
import { createAuthApp } from "./app.ts";
import { buildAuthServerConfig } from "./auth-env.ts";
import { isAuthSchemaReady } from "./auth-readiness.ts";
import { createBackgroundTasks } from "./background-tasks.ts";
import { SystemClock } from "./clock.ts";
import { CryptoIdGenerator } from "./id-generator.ts";
import {
  captureAuthError,
  flushSentry,
  initSentry,
  registerGlobalSentryHandlers,
} from "./observability/sentry.ts";

/**
 * futrob-auth — standalone Better Auth server on Node (ADR-0015, ADR-0021).
 *
 * Serves `/api/auth/*` (email/password + bearer sessions) against the product
 * Postgres. Web forwards `/api/auth/*` here over HTTP and asks for `get-session`,
 * which already carries the resolved `actorId`.
 */

// Local development reads `apps/auth/.env`; deployed environments set real variables,
// which take precedence over the file.
if (existsSync(".env")) process.loadEnvFile(".env");

const config = buildAuthServerConfig(process.env);
const logger = createConsoleLogger({ format: "json", scope: "auth" });
initSentry(process.env);
registerGlobalSentryHandlers();

const reportDefect = (cause: unknown): void => {
  captureAuthError(cause);
};

const pool = createAuthPool(config.databaseUrl, (cause) => {
  console.error(JSON.stringify({ event: "auth.database.idle_client_failed" }));
  reportDefect(cause);
});
const background = createBackgroundTasks((cause) => {
  console.error(JSON.stringify({ event: "auth.background.failed" }));
  reportDefect(cause);
});

const auth = createAuth({
  db: createAuthDb(pool),
  env: config.auth,
  clock: new SystemClock(),
  ids: new CryptoIdGenerator(),
  runInBackground: (task) => background.run(task),
  reportDefect: (cause) => {
    console.error(JSON.stringify({ event: "auth.endpoint.failed" }));
    reportDefect(cause);
  },
});

const app = createAuthApp({
  handleAuth: (request) => auth.handler(request),
  checkHealth: () => isAuthSchemaReady(pool),
  clientIp: config.clientIp,
  reportDefect,
});

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  logger.info("auth.server.listening", { port: info.port });
});

const SHUTDOWN_FLUSH_MS = 2_000;
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("auth.server.stopping", { signal });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await background.drain();
  await pool.end().catch(() => undefined);
  await flushSentry(SHUTDOWN_FLUSH_MS);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
