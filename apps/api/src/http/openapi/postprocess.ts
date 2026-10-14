import { z } from "zod";
import {
  BEARER_AUTH_SCHEME,
  REQUEST_ID_HEADER,
  REQUEST_ID_PARAMETER,
  RETRY_AFTER_HEADER,
} from "@/http/openapi/document-config.ts";
import {
  DEFAULT_API_ERROR_DESCRIPTION,
  DEFAULT_RATE_LIMITED_DESCRIPTION,
} from "@/http/openapi/responses.ts";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;
const jsonValueSchema = z.json();
const jsonRecordSchema = z.record(z.string(), jsonValueSchema);
const responseSchema = z
  .object({
    description: z.string().optional(),
    $ref: z.string().optional(),
    content: z
      .object({
        "application/json": z
          .object({
            schema: z.object({ $ref: z.string().optional() }).passthrough().optional(),
          })
          .optional(),
      })
      .passthrough()
      .optional(),
    headers: jsonRecordSchema.optional(),
  })
  .passthrough();

const API_ERROR_SCHEMA_REF = "#/components/schemas/ApiError";
const API_ERROR_RESPONSE_REF = { $ref: "#/components/responses/ApiError" };
const RATE_LIMITED_RESPONSE_REF = { $ref: "#/components/responses/RateLimited" };
const REQUEST_ID_PARAM_REF = { $ref: "#/components/parameters/RequestId" };
const REQUEST_ID_HEADER_REF = { $ref: "#/components/headers/RequestId" };

const openApiDocumentSchema = z.object({
  openapi: z.string(),
  info: jsonRecordSchema,
  servers: jsonValueSchema.optional(),
  security: jsonValueSchema.optional(),
  tags: jsonValueSchema.optional(),
  paths: z.record(z.string(), jsonRecordSchema),
  components: z
    .object({
      securitySchemes: jsonRecordSchema.optional(),
      parameters: jsonRecordSchema.optional(),
      headers: jsonRecordSchema.optional(),
      schemas: jsonRecordSchema.optional(),
      responses: jsonRecordSchema.optional(),
    })
    .passthrough(),
});

export type OpenApiDocument = z.infer<typeof openApiDocumentSchema>;
type JsonValue = z.infer<typeof jsonValueSchema>;

export function parseGeneratedOpenApiDocument(documentJson: string): OpenApiDocument {
  return openApiDocumentSchema.parse(JSON.parse(documentJson));
}

function schemaRefersToApiError(schema: JsonValue): boolean {
  const parsed = z.object({ $ref: z.string().optional() }).passthrough().safeParse(schema);
  return parsed.success && parsed.data.$ref === API_ERROR_SCHEMA_REF;
}

function isDefaultErrorResponse(response: JsonValue, description: string): boolean {
  const parsed = responseSchema.safeParse(response);
  if (!parsed.success || parsed.data.$ref) return false;
  if (parsed.data.description !== description) return false;
  const schema = parsed.data.content?.["application/json"]?.schema;
  return schema !== undefined && schemaRefersToApiError(jsonValueSchema.parse(schema));
}

function sortedRecord(record: Record<string, JsonValue>): Record<string, JsonValue> {
  return jsonRecordSchema.parse(
    Object.fromEntries(
      [...Object.entries(record)].sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
}

function stripJsonSchemaMeta(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(stripJsonSchemaMeta);
  const parsed = jsonRecordSchema.safeParse(value);
  if (!parsed.success) return value;
  const next: Record<string, JsonValue> = {};
  for (const [key, nested] of Object.entries(parsed.data)) {
    if (key === "$schema" || key === "$id") continue;
    next[key] = stripJsonSchemaMeta(nested);
  }
  return jsonRecordSchema.parse(next);
}

export function postprocessOpenApiDocument(document: OpenApiDocument): OpenApiDocument {
  const components = document.components;
  components.securitySchemes = {
    bearerAuth: BEARER_AUTH_SCHEME,
    ...components.securitySchemes,
  };
  components.parameters = {
    RequestId: REQUEST_ID_PARAMETER,
    ...components.parameters,
  };
  components.headers = {
    RequestId: REQUEST_ID_HEADER,
    RetryAfter: RETRY_AFTER_HEADER,
    ...components.headers,
  };
  components.responses = {
    ApiError: {
      description: DEFAULT_API_ERROR_DESCRIPTION,
      headers: { "X-Request-ID": REQUEST_ID_HEADER_REF },
      content: {
        "application/json": { schema: { $ref: API_ERROR_SCHEMA_REF } },
      },
    },
    RateLimited: {
      description: DEFAULT_RATE_LIMITED_DESCRIPTION,
      headers: {
        "X-Request-ID": REQUEST_ID_HEADER_REF,
        "Retry-After": { $ref: "#/components/headers/RetryAfter" },
      },
      content: {
        "application/json": { schema: { $ref: API_ERROR_SCHEMA_REF } },
      },
    },
    ...components.responses,
  };
  if (components.schemas) {
    components.schemas = sortedRecord(
      jsonRecordSchema.parse(stripJsonSchemaMeta(components.schemas)),
    );
  }
  if (components.responses) {
    components.responses = sortedRecord(components.responses);
  }
  if (components.parameters) {
    components.parameters = sortedRecord(components.parameters);
  }
  if (components.headers) {
    components.headers = sortedRecord(components.headers);
  }
  if (components.securitySchemes) {
    components.securitySchemes = sortedRecord(components.securitySchemes);
  }

  for (const pathItem of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      if (!(method in pathItem)) continue;
      const operationValue = pathItem[method];
      const operation = z
        .object({
          parameters: z.array(jsonValueSchema).optional(),
          responses: z.record(z.string(), jsonValueSchema).optional(),
        })
        .passthrough()
        .parse(operationValue);
      const responses = { ...(operation.responses ?? {}) };
      for (const [status, response] of Object.entries(responses)) {
        if (
          status === "429" &&
          isDefaultErrorResponse(response, DEFAULT_RATE_LIMITED_DESCRIPTION)
        ) {
          responses[status] = RATE_LIMITED_RESPONSE_REF;
          continue;
        }
        if (isDefaultErrorResponse(response, DEFAULT_API_ERROR_DESCRIPTION)) {
          responses[status] = API_ERROR_RESPONSE_REF;
        }
      }
      operation.parameters = [REQUEST_ID_PARAM_REF, ...(operation.parameters ?? [])];
      for (const [status, response] of Object.entries(responses)) {
        const parsed = responseSchema.safeParse(response);
        if (!parsed.success || parsed.data.$ref) continue;
        responses[status] = jsonValueSchema.parse({
          ...parsed.data,
          headers: {
            ...(parsed.data.headers ?? {}),
            "X-Request-ID": REQUEST_ID_HEADER_REF,
          },
        });
      }
      operation.responses = responses;
      pathItem[method] = jsonValueSchema.parse(operation);
    }
  }

  document.paths = z.record(z.string(), jsonRecordSchema).parse(sortedRecord(document.paths));
  return document;
}
