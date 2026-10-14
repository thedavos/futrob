import { extendZodWithOpenApi } from "@hono/zod-openapi";
import { z, type ZodType } from "zod";

extendZodWithOpenApi(z);

/**
 * Vitest still loads a second `zod` for `@futrob/api-contracts` even with
 * `resolve.dedupe`, a `zod` alias, `ssr.noExternal`, and `server.deps.inline`.
 * `extendZodWithOpenApi` only patches the local prototype, so copy `.openapi`
 * onto the other copy when tests hit that case. Production (`tsx` generate
 * and the Node API) uses one hoisted `zod` and never takes this path.
 */
function attachOpenApiForVitest(schema: ZodType): void {
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
  if (!("openapi" in schema)) {
    if (process.env.VITEST == null) {
      throw new Error(
        "Zod schema is missing .openapi(); duplicate zod copies are only patched under Vitest.",
      );
    }
    attachOpenApiForVitest(schema);
  }
  return schema.openapi(name);
}
