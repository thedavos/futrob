import { runScheduleChangeExpiryResponseSchema } from "@futrob/api-contracts";
import type { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { createInternalOpenApiRouter } from "@/http/openapi/router.ts";
import { runScheduleChangeExpiryRoute } from "@/http/openapi/routes/encounters.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerScheduleChangeExpiryRoutes(app: Hono, deps: AppDeps): void {
  const internal = createInternalOpenApiRouter(deps.internalJobSecret);
  internal.openapi(runScheduleChangeExpiryRoute, async () => {
    const result = await deps.modules.runScheduleChangeExpiry.execute();
    return result.isOk()
      ? jsonResponse(runScheduleChangeExpiryResponseSchema.parse(result.value))
      : failureToHttp(result.error);
  });
  app.route("/", internal);
}
