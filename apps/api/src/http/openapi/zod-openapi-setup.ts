import { extendZodWithOpenApi } from "@hono/zod-openapi";
import { z } from "zod";

/**
 * Zod v4 only exposes `.openapi()` on schemas created after this patch runs.
 * Entry points import this module before anything that builds schemas (for
 * example `@futrob/api-contracts`), so shared contract schemas get it too.
 *
 * Zod 4.6 copies methods off each concrete schema prototype at construction,
 * and those prototypes no longer inherit from ZodType.prototype. Mirror
 * `.openapi` onto every Zod* prototype so both new and already-constructed
 * schemas resolve it (asteasolutions/zod-to-openapi#382, unreleased).
 */
extendZodWithOpenApi(z);

type OpenApiCapable = { openapi?: typeof z.ZodType.prototype.openapi };

function attachOpenApiToConcreteZodPrototypes() {
  const openapiMethod = z.ZodType.prototype.openapi;
  if (!(openapiMethod instanceof Function)) {
    return;
  }

  for (const [key, ctor] of Object.entries(z)) {
    if (key === "ZodError" || !key.startsWith("Zod") || !(ctor instanceof Function)) {
      continue;
    }
    const proto: OpenApiCapable | undefined = ctor.prototype;
    if (!proto || "openapi" in proto) {
      continue;
    }
    proto.openapi = openapiMethod;
  }
}

attachOpenApiToConcreteZodPrototypes();
