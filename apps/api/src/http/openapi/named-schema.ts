import { extendZodWithOpenApi } from "@hono/zod-openapi";
import { z, type ZodType } from "zod";

extendZodWithOpenApi(z);

/**
 * Vitest/Vite can load a second `zod` for `@futrob/api-contracts`.
 * `extendZodWithOpenApi` only patches the local prototype; copy the method
 * onto this schema's ZodType prototype when the other copy was used.
 */
function attachOpenApi(schema: ZodType): void {
  if ("openapi" in schema) return;
  let proto: object | null = Object.getPrototypeOf(schema);
  while (proto && proto !== Object.prototype) {
    const parent: object | null = Object.getPrototypeOf(proto);
    if (parent === Object.prototype || parent === null) {
      Object.defineProperty(proto, "openapi", {
        value: z.ZodType.prototype.openapi,
        configurable: true,
        writable: true,
      });
      break;
    }
    proto = parent;
  }
}

/** Registers a stable OpenAPI component name on a Zod schema. */
export function namedSchema<T extends ZodType>(name: string, schema: T): T {
  attachOpenApi(schema);
  return schema.openapi(name);
}
