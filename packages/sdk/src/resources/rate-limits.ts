import {
  checkRateLimitRequestSchema,
  checkRateLimitResponseSchema,
  type CheckRateLimitRequest,
  type CheckRateLimitResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";

/** Service-only: the web BFF asks the product API to count an attempt (ADR-0034). */
export function createRateLimitsResource(http: HttpClient) {
  return {
    async check(
      input: CheckRateLimitRequest,
      options: RequestOptions = {},
    ): Promise<CheckRateLimitResponse> {
      return http.request({
        path: "/internal/rate-limits/check",
        method: "POST",
        body: checkRateLimitRequestSchema.parse(input),
        options,
        parse: (data) => checkRateLimitResponseSchema.parse(data),
      });
    },
  };
}

export type RateLimitsResource = ReturnType<typeof createRateLimitsResource>;
