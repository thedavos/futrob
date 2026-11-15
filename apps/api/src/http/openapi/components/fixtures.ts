import {
  fixtureParticipantSlotSchema,
  fixtureSeriesSchema,
  fixtureEncounterSchema,
  fixtureRoundSchema,
  fixtureStageSchema,
  fixturePlanSchema,
  generateCompetitionFixtureRequestSchema,
  editFixtureEncounterRequestSchema,
  closeSwissRoundRequestSchema,
  withdrawSwissTeamRequestSchema,
  getCurrentCompetitionFixtureResponseSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const FixtureParticipantSlot = namedSchema(
  "FixtureParticipantSlot",
  fixtureParticipantSlotSchema,
);
export const FixtureSeries = namedSchema("FixtureSeries", fixtureSeriesSchema);
export const FixtureEncounter = namedSchema("FixtureEncounter", fixtureEncounterSchema);
export const FixtureRound = namedSchema("FixtureRound", fixtureRoundSchema);
export const FixtureStage = namedSchema("FixtureStage", fixtureStageSchema);
export const FixturePlan = namedSchema("FixturePlan", fixturePlanSchema);
export const GenerateCompetitionFixtureRequest = namedSchema(
  "GenerateCompetitionFixtureRequest",
  generateCompetitionFixtureRequestSchema,
);
export const WithdrawSwissTeamRequest = namedSchema(
  "WithdrawSwissTeamRequest",
  withdrawSwissTeamRequestSchema,
);
export const CloseSwissRoundRequest = namedSchema(
  "CloseSwissRoundRequest",
  closeSwissRoundRequestSchema,
);
export const EditFixtureEncounterRequest = namedSchema(
  "EditFixtureEncounterRequest",
  editFixtureEncounterRequestSchema,
);
export const GetCurrentCompetitionFixtureResponse = namedSchema(
  "GetCurrentCompetitionFixtureResponse",
  getCurrentCompetitionFixtureResponseSchema,
);
