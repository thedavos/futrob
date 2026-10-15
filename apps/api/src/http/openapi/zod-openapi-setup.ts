import { extendZodWithOpenApi } from "@hono/zod-openapi";
import { z } from "zod";

/**
 * Zod v4 only exposes `.openapi()` on schemas created after this patch runs.
 * Entry points import this module before anything that builds schemas (for
 * example `@futrob/api-contracts`), so shared contract schemas get it too.
 */
extendZodWithOpenApi(z);
