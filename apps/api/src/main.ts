import { serve } from "@hono/node-server";
import { createPostgresHealth } from "@/adapters/persistence/postgres.ts";
import { createApp } from "@/app.ts";
import { loadEnv } from "@/config/env.ts";
import { createModules } from "@/di/create-modules.ts";
import { loadDotEnvFile } from "@/utils/load-dotenv.ts";

loadDotEnvFile();

const env = loadEnv();
const dbHealth = createPostgresHealth(env.databaseUrl);

const modules = createModules({
  fetcher: fetch,
  eaClubsBaseUrl: env.eaClubsBaseUrl,
});

const app = createApp({
  modules,
  checkDbHealth: () => dbHealth.check(),
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
