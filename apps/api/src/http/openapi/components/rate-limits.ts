import { checkRateLimitRequestSchema, checkRateLimitResponseSchema } from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const CheckRateLimitRequest = namedSchema(
  "CheckRateLimitRequest",
  checkRateLimitRequestSchema,
);
export const CheckRateLimitResponse = namedSchema(
  "CheckRateLimitResponse",
  checkRateLimitResponseSchema,
);
