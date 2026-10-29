import {
  getPublicCalendarResponseSchema,
  getPublicCompetitionResponseSchema,
  getPublicStandingsResponseSchema,
  publicCalendarEntrySchema,
  publicCompetitionSchema,
  publicStandingRowSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const PublicCompetition = namedSchema("PublicCompetition", publicCompetitionSchema);
export const GetPublicCompetitionResponse = namedSchema(
  "GetPublicCompetitionResponse",
  getPublicCompetitionResponseSchema,
);
export const PublicStandingRow = namedSchema("PublicStandingRow", publicStandingRowSchema);
export const GetPublicStandingsResponse = namedSchema(
  "GetPublicStandingsResponse",
  getPublicStandingsResponseSchema,
);
export const PublicCalendarEntry = namedSchema("PublicCalendarEntry", publicCalendarEntrySchema);
export const GetPublicCalendarResponse = namedSchema(
  "GetPublicCalendarResponse",
  getPublicCalendarResponseSchema,
);
