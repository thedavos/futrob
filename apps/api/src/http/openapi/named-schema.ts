import type { ZodType } from "zod";

/** Registers a stable OpenAPI component name on a Zod schema. */
export function namedSchema<T extends ZodType>(name: string, schema: T): T {
  if (!("openapi" in schema)) {
    throw new Error(
      `Zod schema "${name}" is missing .openapi(); import "@/http/openapi/zod-openapi-setup.ts" before any module that builds schemas.`,
    );
  }
  return schema.openapi(name);
}
