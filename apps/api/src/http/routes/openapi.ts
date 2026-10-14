import type { Hono } from "hono";
import { getOpenApiJsonText, getOpenApiYamlText } from "@futrob/api-contracts";
import { createOpenApiRouter } from "@/http/openapi/router.ts";
import { getOpenApiJsonRoute, getOpenApiYamlRoute } from "@/http/openapi/routes/meta.ts";
import { textResponse } from "@/utils/http-response.ts";

export function registerOpenApiRoutes(app: Hono): void {
  const router = createOpenApiRouter();

  router.openapi(getOpenApiJsonRoute, () =>
    textResponse(getOpenApiJsonText(), "application/json; charset=utf-8"),
  );

  router.openapi(getOpenApiYamlRoute, () =>
    textResponse(getOpenApiYamlText(), "application/yaml; charset=utf-8"),
  );

  app.route("/", router);
}
