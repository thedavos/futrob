import { runConfirmationExpiryResponseSchema } from "@futrob/api-contracts";
import type { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { createInternalOpenApiRouter } from "@/http/openapi/router.ts";
import { runConfirmationExpiryRoute } from "@/http/openapi/routes/results.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerConfirmationExpiryRoutes(app: Hono, deps: AppDeps): void {
  const internal = createInternalOpenApiRouter(deps.internalJobSecret);
  internal.openapi(runConfirmationExpiryRoute, async () => {
    const result = await deps.modules.runConfirmationExpiry.execute();
    return result.isOk()
      ? jsonResponse(runConfirmationExpiryResponseSchema.parse(result.value))
      : failureToHttp(result.error);
  });
  app.route("/", internal);
}
