import { futrobOpenApiV1 } from "@futrob/api-contracts";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { z } from "zod";

const SCHEMA_ID_PREFIX = "https://futrob.test/openapi/components/schemas/";
const COMPONENT_SCHEMA_REF = "#/components/schemas/";
const COMPONENT_RESPONSE_REF = "#/components/responses/";

const jsonValueSchema = z.json();
const ajvSchemaSchema = z.union([z.boolean(), z.record(z.string(), z.json())]);
const refSchema = z.object({ $ref: z.string() });
const jsonContentSchema = z.object({
  content: z
    .object({
      "application/json": z.object({ schema: z.json() }).optional(),
    })
    .optional(),
});
const operationResponsesSchema = z.object({
  responses: z.record(z.string(), z.object({ $ref: z.string().optional() }).passthrough()),
});
const componentEnvelopeSchema = z
  .object({ $schema: z.string().optional(), $id: z.string().optional() })
  .passthrough();

type JsonValue = z.infer<typeof jsonValueSchema>;
type AjvSchema = z.infer<typeof ajvSchemaSchema>;

let cachedAjv: Ajv2020 | undefined;

function schemaId(name: string): string {
  return `${SCHEMA_ID_PREFIX}${name}`;
}

function rewriteRef(ref: string): string {
  if (ref.startsWith(COMPONENT_SCHEMA_REF)) {
    return schemaId(ref.slice(COMPONENT_SCHEMA_REF.length));
  }
  return ref;
}

function jsonClone<T>(value: T): JsonValue {
  return jsonValueSchema.parse(JSON.parse(JSON.stringify(value)));
}

function asJsonValue(value: JsonValue): JsonValue {
  return jsonValueSchema.parse(
    JSON.parse(
      JSON.stringify(value, (key, nested) => {
        if (key !== "$ref") return nested;
        return rewriteRef(z.string().parse(nested));
      }),
    ),
  );
}

function prepareComponentSchema(value: JsonValue): AjvSchema {
  const cloned = asJsonValue(value);
  const envelope = componentEnvelopeSchema.safeParse(cloned);
  if (!envelope.success) return ajvSchemaSchema.parse(cloned);
  const { $schema: _schema, $id: _id, ...rest } = envelope.data;
  return ajvSchemaSchema.parse(rest);
}

function openApiAjv(): Ajv2020 {
  if (cachedAjv) return cachedAjv;
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateSchema: false });
  addFormats(ajv);
  const schemas = futrobOpenApiV1.components.schemas;
  for (const name of Object.keys(schemas)) {
    if (!Object.hasOwn(schemas, name)) continue;
    // SAFETY: Object.keys of the generated OpenAPI components.schemas object.
    const schema = schemas[name as keyof typeof schemas];
    ajv.addSchema(prepareComponentSchema(jsonClone(schema)), schemaId(name));
  }
  cachedAjv = ajv;
  return ajv;
}

function pathItem(pathTemplate: string) {
  const paths = futrobOpenApiV1.paths;
  if (!Object.hasOwn(paths, pathTemplate)) {
    throw new Error(`OpenAPI has no path ${pathTemplate}`);
  }
  // SAFETY: Object.hasOwn confirmed a document.paths key.
  return paths[pathTemplate as keyof typeof paths];
}

function operationOf(pathTemplate: string, method: string) {
  const item = pathItem(pathTemplate);
  const key = method.toLowerCase();
  switch (key) {
    case "get":
    case "post":
    case "put":
    case "patch":
    case "delete":
      if (!(key in item)) return undefined;
      // SAFETY: `key in item` confirmed this path item exposes the HTTP method.
      return item[key as keyof typeof item];
    default:
      throw new Error(`Unsupported HTTP method ${method}`);
  }
}

function componentResponse(name: string) {
  const responses = futrobOpenApiV1.components.responses;
  if (!Object.hasOwn(responses, name)) return undefined;
  // SAFETY: Object.hasOwn confirmed a components.responses key.
  return responses[name as keyof typeof responses];
}

function responseEntry(operation: NonNullable<ReturnType<typeof operationOf>>, status: string) {
  const parsed = operationResponsesSchema.parse(jsonClone(operation));
  if (!(status in parsed.responses)) return undefined;
  const entry = parsed.responses[status];
  const ref = refSchema.safeParse(entry);
  if (!ref.success) return entry;
  if (!ref.data.$ref.startsWith(COMPONENT_RESPONSE_REF)) {
    throw new Error(`Unsupported response $ref ${ref.data.$ref}`);
  }
  return componentResponse(ref.data.$ref.slice(COMPONENT_RESPONSE_REF.length));
}

function jsonSchemaOf(entry: z.infer<typeof jsonContentSchema>): JsonValue | undefined {
  const schema = entry.content?.["application/json"]?.schema;
  return schema === undefined ? undefined : jsonValueSchema.parse(schema);
}

function validateBody(
  schema: JsonValue,
  body: JsonValue,
  method: string,
  path: string,
  status: number,
): void {
  const ajv = openApiAjv();
  const ref = refSchema.safeParse(schema);
  const compiled = ref.success
    ? ajv.compile({ $ref: rewriteRef(ref.data.$ref) })
    : ajv.compile(prepareComponentSchema(schema));
  if (compiled(body)) return;
  throw new Error(
    `OpenAPI ${method.toUpperCase()} ${path} ${status} body does not match: ${ajv.errorsText(compiled.errors)}`,
  );
}

/** Assert an HTTP response matches the documented OpenAPI operation. */
export async function expectMatchesOpenApi(
  res: Response,
  method: string,
  pathTemplate: string,
): Promise<void> {
  const operation = operationOf(pathTemplate, method);
  if (!operation) {
    throw new Error(`OpenAPI has no operation ${method.toUpperCase()} ${pathTemplate}`);
  }
  const status = String(res.status);
  const entry = responseEntry(operation, status);
  if (entry === undefined) {
    throw new Error(
      `OpenAPI ${method.toUpperCase()} ${pathTemplate} does not document status ${status}`,
    );
  }
  const content = jsonContentSchema.safeParse(entry);
  const schema = content.success ? jsonSchemaOf(content.data) : undefined;
  const text = await res.clone().text();
  if (schema === undefined) {
    if (text.length > 0) {
      throw new Error(
        `OpenAPI ${method.toUpperCase()} ${pathTemplate} ${status} has no JSON schema but the body is not empty`,
      );
    }
    return;
  }
  validateBody(schema, jsonValueSchema.parse(JSON.parse(text)), method, pathTemplate, res.status);
}
