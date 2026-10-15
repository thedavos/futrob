import { runCandidateRecalculationResponseSchema } from "@futrob/api-contracts";
import type { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { createInternalOpenApiRouter } from "@/http/openapi/router.ts";
import { runCandidateRecalculationRoute } from "@/http/openapi/routes/results.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerCandidateRecalculationRoutes(app: Hono, deps: AppDeps): void {
  const internal = createInternalOpenApiRouter(deps.internalJobSecret);
  internal.openapi(runCandidateRecalculationRoute, async () => {
    const result = await deps.modules.recalculateRescheduledCandidates.execute();
    return result.isOk()
      ? jsonResponse(runCandidateRecalculationResponseSchema.parse(result.value))
      : failureToHttp(result.error);
  });
  app.route("/", internal);
}
