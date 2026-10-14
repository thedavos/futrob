import {
  playerProfileSchema,
  playerGameAccountSchema,
  playerGameAccountInputSchema,
  playerExternalClubAssociationSchema,
  playerExternalClubSelectionInputSchema,
  getMyPlayerProfileResponseSchema,
  addMyPlayerGameAccountResponseSchema,
  updateMyPlayerGameAccountRequestSchema,
  updateMyPlayerGameAccountResponseSchema,
  associateMyPlayerExternalClubRequestSchema,
  associateMyPlayerExternalClubResponseSchema,
  playerStatisticMetricSchema,
  playerPersonalStatsSchema,
  getMyStatisticsResponseSchema,
  playerMatchContributionSchema,
  getMyMatchesResponseSchema,
  nextEncounterSideSchema,
  nextEncounterSchema,
  getMyNextEncounterResponseSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const PlayerProfile = namedSchema("PlayerProfile", playerProfileSchema);
export const PlayerGameAccount = namedSchema("PlayerGameAccount", playerGameAccountSchema);
export const PlayerGameAccountInput = namedSchema(
  "PlayerGameAccountInput",
  playerGameAccountInputSchema,
);
export const PlayerExternalClubAssociation = namedSchema(
  "PlayerExternalClubAssociation",
  playerExternalClubAssociationSchema,
);
export const PlayerExternalClubSelectionInput = namedSchema(
  "PlayerExternalClubSelectionInput",
  playerExternalClubSelectionInputSchema,
);
export const GetMyPlayerProfileResponse = namedSchema(
  "GetMyPlayerProfileResponse",
  getMyPlayerProfileResponseSchema,
);
export const AddMyPlayerGameAccountResponse = namedSchema(
  "AddMyPlayerGameAccountResponse",
  addMyPlayerGameAccountResponseSchema,
);
export const UpdateMyPlayerGameAccountRequest = namedSchema(
  "UpdateMyPlayerGameAccountRequest",
  updateMyPlayerGameAccountRequestSchema,
);
export const UpdateMyPlayerGameAccountResponse = namedSchema(
  "UpdateMyPlayerGameAccountResponse",
  updateMyPlayerGameAccountResponseSchema,
);
export const AssociateMyPlayerExternalClubRequest = namedSchema(
  "AssociateMyPlayerExternalClubRequest",
  associateMyPlayerExternalClubRequestSchema,
);
export const AssociateMyPlayerExternalClubResponse = namedSchema(
  "AssociateMyPlayerExternalClubResponse",
  associateMyPlayerExternalClubResponseSchema,
);
export const PlayerStatisticMetric = namedSchema(
  "PlayerStatisticMetric",
  playerStatisticMetricSchema,
);
export const PlayerPersonalStats = namedSchema("PlayerPersonalStats", playerPersonalStatsSchema);
export const GetMyStatisticsResponse = namedSchema(
  "GetMyStatisticsResponse",
  getMyStatisticsResponseSchema,
);
export const PlayerMatchContribution = namedSchema(
  "PlayerMatchContribution",
  playerMatchContributionSchema,
);
export const GetMyMatchesResponse = namedSchema("GetMyMatchesResponse", getMyMatchesResponseSchema);
export const NextEncounterSide = namedSchema("NextEncounterSide", nextEncounterSideSchema);
export const NextEncounter = namedSchema("NextEncounter", nextEncounterSchema);
export const GetMyNextEncounterResponse = namedSchema(
  "GetMyNextEncounterResponse",
  getMyNextEncounterResponseSchema,
);
