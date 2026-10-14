import { apiErrorSchema } from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const ApiError = namedSchema("ApiError", apiErrorSchema);

export const API_ERROR_RESPONSE = {
  description: "API error",
  content: {
    "application/json": {
      schema: ApiError,
    },
  },
} as const;

export const RATE_LIMITED_RESPONSE = {
  description: "Rate limit exceeded",
  content: {
    "application/json": {
      schema: ApiError,
    },
  },
} as const;

export const DEFAULT_API_ERROR_DESCRIPTION = API_ERROR_RESPONSE.description;
export const DEFAULT_RATE_LIMITED_DESCRIPTION = RATE_LIMITED_RESPONSE.description;
