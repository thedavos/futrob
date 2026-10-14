import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  AddMyPlayerGameAccountResponse,
  AssociateMyPlayerExternalClubRequest,
  AssociateMyPlayerExternalClubResponse,
  CompetitionRosterMembership,
  GetMyGameProfileResponse,
  GetMyMatchesResponse,
  GetMyNextEncounterResponse,
  GetMyPlayerProfileResponse,
  GetMyRecentMatchResponse,
  GetMyRecentMatchesResponse,
  GetMyStatisticsResponse,
  PlayerGameAccountInput,
  UpdateMyPlayerGameAccountRequest,
  UpdateMyPlayerGameAccountResponse,
} from "@/http/openapi/components.ts";
import {
  acceptRosterInvitationRequestSchema,
  getMyGameProfileQuerySchema,
  getMyMatchesQuerySchema,
  getMyRecentMatchPathSchema,
  getMyRecentMatchQuerySchema,
  getMyRecentMatchesQuerySchema,
  getMyStatisticsQuerySchema,
  listMyRosterInvitationsResponseSchema,
  respondToRosterInvitationRequestSchema,
  respondToRosterInvitationResponseSchema,
  updateMyPlayerGameAccountParamsSchema,
} from "@futrob/api-contracts";

export const getMyPlayerProfileRoute = defineRoute({
  method: "get",
  path: "/players/me",
  operationId: "getMyPlayerProfile",
  tags: ["players"],
  summary: "Get the authenticated actor player profile",
  success: {
    status: 200,
    description: "Profile and linked game accounts",
    schema: GetMyPlayerProfileResponse,
  },
  errors: [401],
});

export const addMyPlayerGameAccountRoute = defineRoute({
  method: "post",
  path: "/players/me/game-accounts",
  operationId: "addMyPlayerGameAccount",
  tags: ["players"],
  summary: "Add a declared EA game identifier to the personal profile",
  body: PlayerGameAccountInput,
  success: {
    status: 201,
    description: "Idempotently linked account",
    schema: AddMyPlayerGameAccountResponse,
  },
  errors: [400, 401],
});

export const updateMyPlayerGameAccountRoute = defineRoute({
  method: "patch",
  path: "/players/me/game-accounts/{accountId}",
  operationId: "updateMyPlayerGameAccount",
  tags: ["players"],
  summary: "Update the declared identity of a personal game account",
  params: updateMyPlayerGameAccountParamsSchema,
  body: UpdateMyPlayerGameAccountRequest,
  success: {
    status: 200,
    description: "Updated account, same id",
    schema: UpdateMyPlayerGameAccountResponse,
  },
  errors: [400, 401, 404, 409],
});

export const associateMyPlayerExternalClubRoute = defineRoute({
  method: "post",
  path: "/players/me/external-club",
  operationId: "associateMyPlayerExternalClub",
  tags: ["players"],
  summary: "Associate an EA Clubs club with the personal player profile",
  body: AssociateMyPlayerExternalClubRequest,
  success: {
    status: 201,
    description: "Idempotently associated external club",
    schema: AssociateMyPlayerExternalClubResponse,
  },
  errors: [400, 401, 404],
});

export const getMyStatisticsRoute = defineRoute({
  method: "get",
  path: "/players/me/statistics",
  operationId: "getMyStatistics",
  tags: ["players"],
  summary: "Get personal official statistics for the authenticated player",
  query: getMyStatisticsQuerySchema,
  success: {
    status: 200,
    description: "Aggregated personal statistics, or null when none exist",
    schema: GetMyStatisticsResponse,
  },
  errors: [401, 403],
});

export const getMyMatchesRoute = defineRoute({
  method: "get",
  path: "/players/me/matches",
  operationId: "getMyMatches",
  tags: ["players"],
  summary: "List personal match contributions projected from approved official results",
  query: getMyMatchesQuerySchema,
  success: {
    status: 200,
    description: "Cursor page of matched contributions",
    schema: GetMyMatchesResponse,
  },
  errors: [400, 401, 403],
});

export const getMyRecentMatchesRoute = defineRoute({
  method: "get",
  path: "/players/me/recent-matches",
  operationId: "getMyRecentMatches",
  tags: ["players"],
  summary:
    "List recent provider matches for the selected ExternalClub, including matches the player did not play",
  query: getMyRecentMatchesQuerySchema,
  success: {
    status: 200,
    description:
      "needs_club when no club is associated, needs_game_account when no identifier is registered, or ready club matches classified as played or not_played",
    schema: GetMyRecentMatchesResponse,
  },
  errors: [400, 401, 403, 502],
});

export const getMyNextEncounterRoute = defineRoute({
  method: "get",
  path: "/players/me/next-encounter",
  operationId: "getMyNextEncounter",
  tags: ["players"],
  summary: "Get the next scheduled encounter for a team the authenticated player belongs to",
  success: {
    status: 200,
    description:
      "The next upcoming encounter, or a null encounter when the player has no scheduled fixture",
    schema: GetMyNextEncounterResponse,
  },
  errors: [401],
});

export const getMyRecentMatchRoute = defineRoute({
  method: "get",
  path: "/players/me/recent-matches/{providerKey}/{externalMatchId}",
  operationId: "getMyRecentMatch",
  tags: ["players"],
  summary: "Get one personal provider match from the final 50-result recent window",
  params: getMyRecentMatchPathSchema,
  query: getMyRecentMatchQuerySchema,
  success: {
    status: 200,
    description: "Prerequisite, not-found, or ready detail state with the complete provider roster",
    schema: GetMyRecentMatchResponse,
  },
  errors: [400, 401, 403, 502, 503],
});

export const acceptRosterInvitationRoute = defineRoute({
  method: "post",
  path: "/roster-invitations/accept",
  operationId: "acceptRosterInvitation",
  tags: ["players"],
  summary: "Accept an invitation to a competition roster",
  body: acceptRosterInvitationRequestSchema,
  success: {
    status: 201,
    description: "Roster invitation accepted",
    schema: CompetitionRosterMembership,
  },
  errors: [400, 401, 404, 409, 429],
});

export const listMyRosterInvitationsRoute = defineRoute({
  method: "get",
  path: "/players/me/roster-invitations",
  operationId: "listMyRosterInvitations",
  tags: ["players"],
  summary: "List roster invitations directed at the authenticated player",
  success: {
    status: 200,
    description: "Directed roster invitations, newest first",
    schema: listMyRosterInvitationsResponseSchema,
  },
  errors: [401],
});

export const respondToRosterInvitationRoute = defineRoute({
  method: "post",
  path: "/roster-invitations/{invitationId}/respond",
  operationId: "respondToRosterInvitation",
  tags: ["players"],
  summary: "Accept or decline a roster invitation directed at the authenticated player",
  params: pathParams(["invitationId"]),
  body: respondToRosterInvitationRequestSchema,
  success: {
    status: 200,
    description: "Invitation response applied",
    schema: respondToRosterInvitationResponseSchema,
  },
  errors: [400, 401, 403, 404, 409, 429],
});

export const getMyGameProfileRoute = defineRoute({
  method: "get",
  path: "/players/me/game-profile",
  operationId: "getMyGameProfile",
  tags: ["players"],
  summary: "Read the authenticated player's provider game profile",
  query: getMyGameProfileQuerySchema,
  success: {
    status: 200,
    description: "Ready profile or a missing-club/account state",
    schema: GetMyGameProfileResponse,
  },
  errors: [400, 401, 503],
});
