import {
  competitionCoverSchema,
  competitionTeamRangeSchema,
  competitionScheduleSchema,
  competitionDraftInputSchema,
  competitionMatchRulesSchema,
  competitionRulesSchema,
  competitionSchema,
  competitionDraftSchema,
  updateCompetitionDraftRequestSchema,
  listAccessibleCompetitionsResponseSchema,
  exploreCompetitionSchema,
  exploreCompetitionsResponseSchema,
  acceptCompetitionInvitationResponseSchema,
  competitionEntrySchema,
  competitionParticipantInputSchema,
  competitionApplicationSchema,
  registerTeamEntryRequestSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const CompetitionCover = namedSchema("CompetitionCover", competitionCoverSchema);
export const CompetitionTeamRange = namedSchema("CompetitionTeamRange", competitionTeamRangeSchema);
export const CompetitionSchedule = namedSchema("CompetitionSchedule", competitionScheduleSchema);
export const CompetitionDraftInput = namedSchema(
  "CompetitionDraftInput",
  competitionDraftInputSchema,
);
export const CompetitionMatchRules = namedSchema(
  "CompetitionMatchRules",
  competitionMatchRulesSchema,
);
export const CompetitionRules = namedSchema("CompetitionRules", competitionRulesSchema);
export const Competition = namedSchema("Competition", competitionSchema);
export const CompetitionDraft = namedSchema("CompetitionDraft", competitionDraftSchema);
export const UpdateCompetitionDraftInput = namedSchema(
  "UpdateCompetitionDraftInput",
  updateCompetitionDraftRequestSchema,
);
export const ListAccessibleCompetitionsResponse = namedSchema(
  "ListAccessibleCompetitionsResponse",
  listAccessibleCompetitionsResponseSchema,
);
export const ExploreCompetition = namedSchema("ExploreCompetition", exploreCompetitionSchema);
export const ExploreCompetitionsResponse = namedSchema(
  "ExploreCompetitionsResponse",
  exploreCompetitionsResponseSchema,
);
export const AcceptCompetitionInvitationResponse = namedSchema(
  "AcceptCompetitionInvitationResponse",
  acceptCompetitionInvitationResponseSchema,
);
export const CompetitionEntry = namedSchema("CompetitionEntry", competitionEntrySchema);
export const CompetitionParticipantInput = namedSchema(
  "CompetitionParticipantInput",
  competitionParticipantInputSchema,
);
export const CompetitionApplication = namedSchema(
  "CompetitionApplication",
  competitionApplicationSchema,
);
export const RegisterTeamEntryRequest = namedSchema(
  "RegisterTeamEntryRequest",
  registerTeamEntryRequestSchema,
);
