import { OpenAPIHono } from "@hono/zod-openapi";
import { OPENAPI_DOCUMENT_INFO } from "@/http/openapi/document-config.ts";
import {
  parseGeneratedOpenApiDocument,
  postprocessOpenApiDocument,
  type OpenApiDocument,
} from "@/http/openapi/postprocess.ts";
import { registerNamedComponents } from "@/http/openapi/register-components.ts";
import { openApiRoutes } from "@/http/openapi/routes/index.ts";
import "@/http/openapi/named-schema.ts";

let cached: OpenApiDocument | undefined;

function dummyHandler() {
  return new Response();
}

export function buildOpenApiDocument(): OpenApiDocument {
  if (cached) return cached;
  const app = new OpenAPIHono();
  registerNamedComponents(app.openAPIRegistry);
  for (const route of openApiRoutes) {
    // SAFETY: Generation only harvests the OpenAPI registry; these handlers never run.
    app.openapi(route, dummyHandler as never);
  }
  const document = parseGeneratedOpenApiDocument(
    JSON.stringify(app.getOpenAPI31Document(OPENAPI_DOCUMENT_INFO)),
  );
  cached = postprocessOpenApiDocument(document);
  return cached;
}
