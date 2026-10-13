import { runScheduleChangeExpiryResponseSchema } from "@futrob/api-contracts";
import { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { createInternalJobAuthMiddleware } from "@/http/middleware/service-auth.ts";
import { failureToHttp } from "@/http/errors.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerScheduleChangeExpiryRoutes(app: Hono, deps: AppDeps): void {
  const internal = new Hono();
  internal.use("*", createInternalJobAuthMiddleware(deps.internalJobSecret));
  internal.post("/internal/scheduling/reschedule-expiry/run", async () => {
    const result = await deps.modules.runScheduleChangeExpiry.execute();
    return result.isOk()
      ? jsonResponse(runScheduleChangeExpiryResponseSchema.parse(result.value))
      : failureToHttp(result.error);
  });
  app.route("/", internal);
}
