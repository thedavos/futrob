import {
  externalClubSchema,
  providerMatchTeamSchema,
  providerPlayerMatchStatsSchema,
  providerMatchSchema,
  providerMatchListSchema,
  searchClubsResponseSchema,
  getClubMatchesResponseSchema,
  playerRecentProviderMatchSchema,
  playerRecentProviderMatchDetailSchema,
  getMyRecentMatchesResponseSchema,
  getMyRecentMatchResponseSchema,
  getMyGameProfileResponseSchema,
  enqueueProviderSyncJobRequestSchema,
  providerSyncJobResponseSchema,
  providerHealthResponseSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const ExternalClub = namedSchema("ExternalClub", externalClubSchema);
export const ProviderMatchTeam = namedSchema("ProviderMatchTeam", providerMatchTeamSchema);
export const ProviderPlayerMatchStats = namedSchema(
  "ProviderPlayerMatchStats",
  providerPlayerMatchStatsSchema,
);
export const ProviderMatch = namedSchema("ProviderMatch", providerMatchSchema);
export const ProviderMatchList = namedSchema("ProviderMatchList", providerMatchListSchema);
export const SearchClubsResponse = namedSchema("SearchClubsResponse", searchClubsResponseSchema);
export const GetClubMatchesResponse = namedSchema(
  "GetClubMatchesResponse",
  getClubMatchesResponseSchema,
);
export const PlayerRecentProviderMatch = namedSchema(
  "PlayerRecentProviderMatch",
  playerRecentProviderMatchSchema,
);
export const PlayerRecentProviderMatchDetail = namedSchema(
  "PlayerRecentProviderMatchDetail",
  playerRecentProviderMatchDetailSchema,
);
export const GetMyRecentMatchesResponse = namedSchema(
  "GetMyRecentMatchesResponse",
  getMyRecentMatchesResponseSchema,
);
export const GetMyRecentMatchResponse = namedSchema(
  "GetMyRecentMatchResponse",
  getMyRecentMatchResponseSchema,
);
export const GetMyGameProfileResponse = namedSchema(
  "GetMyGameProfileResponse",
  getMyGameProfileResponseSchema,
);
export const EnqueueProviderSyncJobRequest = namedSchema(
  "EnqueueProviderSyncJobRequest",
  enqueueProviderSyncJobRequestSchema,
);
export const ProviderSyncJobResponse = namedSchema(
  "ProviderSyncJobResponse",
  providerSyncJobResponseSchema,
);
export const ProviderHealthResponse = namedSchema(
  "ProviderHealthResponse",
  providerHealthResponseSchema,
);
