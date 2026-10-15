import type { Hono } from "hono";
import { pingResponseSchema } from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { createOpenApiRouter } from "@/http/openapi/router.ts";
import { metaHealthRoute, metaPingRoute } from "@/http/openapi/routes/meta.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerMetaRoutes(app: Hono, deps: AppDeps): void {
  const router = createOpenApiRouter();

  router.openapi(metaPingRoute, () => {
    const body = pingResponseSchema.parse({
      ok: true,
      service: "futrob",
      apiVersion: "v1",
    });
    return jsonResponse(body);
  });

  router.openapi(metaHealthRoute, async () => {
    const db = await deps.checkDbHealth();
    return jsonResponse({
      ok: db !== "error",
      service: "futrob",
      apiVersion: "v1",
      db,
    });
  });

  app.route("/", router);
}
