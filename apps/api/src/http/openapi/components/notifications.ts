import {
  emailPreferencesSchema,
  listActivitiesResponseSchema,
  runEmailDispatchResponseSchema,
  unsubscribeEmailResponseSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const ListActivitiesResponse = namedSchema(
  "ListActivitiesResponse",
  listActivitiesResponseSchema,
);

export const EmailPreferences = namedSchema("EmailPreferences", emailPreferencesSchema);

export const UnsubscribeEmailResponse = namedSchema(
  "UnsubscribeEmailResponse",
  unsubscribeEmailResponseSchema,
);

export const RunEmailDispatchResponse = namedSchema(
  "RunEmailDispatchResponse",
  runEmailDispatchResponseSchema,
);
