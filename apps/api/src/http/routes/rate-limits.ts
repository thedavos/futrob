import type { Hono } from "hono";
import { checkRateLimitResponseSchema, type CheckRateLimitResponse } from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { logCorrelatedError, logCorrelatedInfo } from "@/context/request-correlation.ts";
import { apiErrorResponse } from "@/http/errors.ts";
import { createInternalOpenApiRouter } from "@/http/openapi/router.ts";
import { checkRateLimitRoute } from "@/http/openapi/routes/rate-limits.ts";
import { jsonResponse } from "@/utils/http-response.ts";

const rateLimitUnavailable = () =>
  apiErrorResponse(503, {
    code: "api.rate_limit_unavailable",
    messageKey: "errors.api.rate_limit_unavailable",
  });

/** Web BFF rate limits (ADR-0034): the API owns the counters; the BFF only asks. */
export function registerRateLimitRoutes(app: Hono, deps: AppDeps): void {
  const internal = createInternalOpenApiRouter(deps.internalJobSecret);
  internal.openapi(checkRateLimitRoute, async (c) => {
    const rateLimits = deps.modules.rateLimits;
    if (!rateLimits) return rateLimitUnavailable();
    const request = c.req.valid("json");
    let decision: CheckRateLimitResponse;
    try {
      decision = await rateLimits.check(request);
    } catch (error) {
      logCorrelatedError("rate_limit.check_failed", {
        policy: request.policy,
        errorName: error instanceof Error ? error.name : "unknown",
      });
      return rateLimitUnavailable();
    }
    if (decision.outcome === "limited") {
      logCorrelatedInfo("rate_limit.checked", {
        policy: request.policy,
        outcome: decision.outcome,
        limitedBy: decision.limitedBy,
        retryAfterSeconds: decision.retryAfterSeconds,
      });
    } else {
      logCorrelatedInfo("rate_limit.checked", {
        policy: request.policy,
        outcome: decision.outcome,
      });
    }
    return jsonResponse(checkRateLimitResponseSchema.parse(decision));
  });
  app.route("/", internal);
}
