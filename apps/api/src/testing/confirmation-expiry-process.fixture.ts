import { serve } from "@hono/node-server";
import { Pool } from "pg";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";

const schema = process.env.TEST_SCHEMA;
if (!schema || !/^confirmation_process_[a-f0-9]+$/.test(schema))
  throw new Error("Expected isolated test schema");
const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
  options: `-c search_path=${schema}`,
});
const instant = process.env.TEST_CLOCK;
if (!instant) throw new Error("Expected controlled test clock");
const modules = createModules({
  pool,
  clock: { now: () => new Date(instant) },
  resultsSystemActorId: process.env.TEST_ACTOR_ID,
  eaClubsBaseUrl: "https://unused.test",
  fetcher: async () => Response.json([]),
});
const app = createApp({
  modules,
  checkDbHealth: async () => "ok",
  internalJobSecret: "process-expiry-secret",
  correlationLogger: { info() {}, error() {} },
});
const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 }, (info) => {
  process.send?.({ port: info.port });
});
process.on("SIGTERM", () => {
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
});
