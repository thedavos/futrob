import { listActivitiesResponseSchema } from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const ListActivitiesResponse = namedSchema(
  "ListActivitiesResponse",
  listActivitiesResponseSchema,
);
