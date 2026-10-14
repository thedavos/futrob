import { defineRoute } from "@/http/openapi/define-route.ts";
import { z } from "zod";
import { HealthResponse, PingResponse } from "@/http/openapi/components.ts";

export const metaPingRoute = defineRoute({
  method: "get",
  path: "/meta/ping",
  operationId: "metaPing",
  tags: ["meta"],
  summary: "Health ping",
  public: true,
  success: { status: 200, description: "Service is up", schema: PingResponse },
});

export const metaHealthRoute = defineRoute({
  method: "get",
  path: "/meta/health",
  operationId: "metaHealth",
  tags: ["meta"],
  summary: "Service and database health",
  public: true,
  success: {
    status: 200,
    description: "Current service and database health",
    schema: HealthResponse,
  },
});

export const getOpenApiJsonRoute = defineRoute({
  method: "get",
  path: "/openapi.json",
  operationId: "getOpenApiJson",
  tags: ["meta"],
  summary: "OpenAPI document (JSON)",
  public: true,
  success: {
    status: 200,
    description: "OpenAPI 3.1 JSON",
    schema: z.record(z.string(), z.unknown()),
  },
});

export const getOpenApiYamlRoute = defineRoute({
  method: "get",
  path: "/openapi.yaml",
  operationId: "getOpenApiYaml",
  tags: ["meta"],
  summary: "OpenAPI document (YAML)",
  public: true,
  success: {
    status: 200,
    description: "OpenAPI 3.1 YAML",
    mediaType: "application/yaml",
    schema: z.string(),
  },
});
