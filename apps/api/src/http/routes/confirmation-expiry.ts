import { runConfirmationExpiryResponseSchema } from "@futrob/api-contracts";
import { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { createInternalJobAuthMiddleware } from "@/http/middleware/service-auth.ts";
import { failureToHttp } from "@/http/errors.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerConfirmationExpiryRoutes(app: Hono, deps: AppDeps): void {
  const internal = new Hono();
  internal.use("*", createInternalJobAuthMiddleware(deps.internalJobSecret));
  internal.post("/internal/results/confirmation-expiry/run", async () => {
    const result = await deps.modules.runConfirmationExpiry.execute();
    return result.isOk()
      ? jsonResponse(runConfirmationExpiryResponseSchema.parse(result.value))
      : failureToHttp(result.error);
  });
  app.route("/", internal);
}
