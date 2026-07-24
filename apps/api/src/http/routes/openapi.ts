import type { Hono } from "hono";
import { getOpenApiJsonText, getOpenApiYamlText } from "@futrob/api-contracts";
import { textResponse } from "@/utils/http-response.ts";

export function registerOpenApiRoutes(app: Hono): void {
  app.get("/openapi.json", () =>
    textResponse(getOpenApiJsonText(), "application/json; charset=utf-8"),
  );

  app.get("/openapi.yaml", () =>
    textResponse(getOpenApiYamlText(), "application/yaml; charset=utf-8"),
  );
}
