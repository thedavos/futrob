import type { Hono } from "hono";
import { pingResponseSchema } from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerMetaRoutes(app: Hono, deps: AppDeps): void {
  app.get("/meta/ping", () => {
    const body = pingResponseSchema.parse({
      ok: true,
      service: "futrob",
      apiVersion: "v1",
    });
    return jsonResponse(body);
  });

  app.get("/meta/health", async () => {
    const db = await deps.checkDbHealth();
    return jsonResponse({
      ok: db !== "error",
      service: "futrob",
      apiVersion: "v1",
      db,
    });
  });
}
