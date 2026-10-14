import { pingResponseSchema, healthResponseSchema } from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const PingResponse = namedSchema("PingResponse", pingResponseSchema);
export const HealthResponse = namedSchema("HealthResponse", healthResponseSchema);
