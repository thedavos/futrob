import { extendZodWithOpenApi } from "@hono/zod-openapi";
import { z, type ZodType } from "zod";

extendZodWithOpenApi(z);

/** Registers a stable OpenAPI component name on a Zod schema. */
export function namedSchema<T extends ZodType>(name: string, schema: T): T {
  return schema.openapi(name);
}
