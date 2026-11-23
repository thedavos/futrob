import { defineRoute } from "@/http/openapi/define-route.ts";
import { CheckRateLimitRequest, CheckRateLimitResponse } from "@/http/openapi/components.ts";

export const checkRateLimitRoute = defineRoute({
  method: "post",
  path: "/internal/rate-limits/check",
  operationId: "checkRateLimit",
  tags: ["rate-limits"],
  summary: "Count one web BFF attempt against its rate-limit policy",
  description:
    "Service-only, authenticated with the internal bearer secret (ADR-0034). Counts the attempt for the actor (when present) and the client IP in the policy's fixed window and answers whether it may proceed. Actor and IP are stored only as HMAC fingerprints. 503 means the limiter is not configured or its store failed; the BFF fails closed.",
  body: CheckRateLimitRequest,
  success: {
    status: 200,
    description: "Decision for this attempt",
    schema: CheckRateLimitResponse,
  },
  errors: [400, 401, 503],
  errorDescriptions: {
    503: "Rate limiting is not configured or its store is unavailable",
  },
});
