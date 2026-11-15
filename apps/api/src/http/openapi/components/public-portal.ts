import {
  getPublicBracketResponseSchema,
  getPublicCalendarResponseSchema,
  getPublicCompetitionResponseSchema,
  getPublicRankingResponseSchema,
  getPublicRulesResponseSchema,
  getPublicStandingsResponseSchema,
  getPublicTeamsResponseSchema,
  listPublicCompetitionsResponseSchema,
  publicBracketEncounterSchema,
  publicBracketSideSchema,
  publicBracketStageSchema,
  publicCalendarEntrySchema,
  publicMatchScoreSchema,
  publicStageRulesSchema,
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
export const PublicMatchScore = namedSchema("PublicMatchScore", publicMatchScoreSchema);
export const GetPublicTeamsResponse = namedSchema(
  "GetPublicTeamsResponse",
  getPublicTeamsResponseSchema,
);
export const PublicStageRules = namedSchema("PublicStageRules", publicStageRulesSchema);
export const GetPublicRulesResponse = namedSchema(
  "GetPublicRulesResponse",
  getPublicRulesResponseSchema,
);
export const PublicBracketSide = namedSchema("PublicBracketSide", publicBracketSideSchema);
export const PublicBracketEncounter = namedSchema(
  "PublicBracketEncounter",
  publicBracketEncounterSchema,
);
export const PublicBracketStage = namedSchema("PublicBracketStage", publicBracketStageSchema);
export const GetPublicBracketResponse = namedSchema(
  "GetPublicBracketResponse",
  getPublicBracketResponseSchema,
);
export const GetPublicRankingResponse = namedSchema(
  "GetPublicRankingResponse",
  getPublicRankingResponseSchema,
);
export const ListPublicCompetitionsResponse = namedSchema(
  "ListPublicCompetitionsResponse",
  listPublicCompetitionsResponseSchema,
);
