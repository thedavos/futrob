import {
  getMyNextEncounterResponseSchema,
  getMyPlayerProfileResponseSchema,
  getMyTeamsResponseSchema,
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
  associateMyPlayerExternalClubRequestSchema,
  associateMyPlayerExternalClubResponseSchema,
  setActiveTeamRequestSchema,
  setActiveTeamResponseSchema,
  updateMyPlayerGameAccountRequestSchema,
  updateMyPlayerGameAccountResponseSchema,
  type GetMyNextEncounterResponse,
  type GetMyPlayerProfileResponse,
  type GetMyTeamsResponse,
  type AddMyPlayerGameAccountRequest,
  type AddMyPlayerGameAccountResponse,
  type AssociateMyPlayerExternalClubRequest,
  type AssociateMyPlayerExternalClubResponse,
  type SetActiveTeamRequest,
  type SetActiveTeamResponse,
  type UpdateMyPlayerGameAccountRequest,
  type UpdateMyPlayerGameAccountResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/** Player self-service endpoints under `/players/me`. */
export function createPlayersResource(http: HttpClient) {
  return {
    async getProfile(options: RequestOptions = {}): Promise<GetMyPlayerProfileResponse> {
      return http.request({
        path: "/players/me",
        method: "GET",
        options,
        parse: (data) => getMyPlayerProfileResponseSchema.parse(data),
      });
    },

    async addGameAccount(
      input: AddMyPlayerGameAccountRequest,
      options: RequestOptions = {},
    ): Promise<AddMyPlayerGameAccountResponse> {
      const body = addMyPlayerGameAccountRequestSchema.parse(input);
      return http.request({
        path: "/players/me/game-accounts",
        method: "POST",
        body,
        options,
        parse: (data) => addMyPlayerGameAccountResponseSchema.parse(data),
      });
    },

    async updateGameAccount(
      accountId: string,
      input: UpdateMyPlayerGameAccountRequest,
      options: RequestOptions = {},
    ): Promise<UpdateMyPlayerGameAccountResponse> {
      const body = updateMyPlayerGameAccountRequestSchema.parse(input);
      return http.request({
        path: apiPath("players", "me", "game-accounts", accountId),
        method: "PATCH",
        body,
        options,
        parse: (data) => updateMyPlayerGameAccountResponseSchema.parse(data),
      });
    },

    async associateExternalClub(
      input: AssociateMyPlayerExternalClubRequest,
      options: RequestOptions = {},
    ): Promise<AssociateMyPlayerExternalClubResponse> {
      const body = associateMyPlayerExternalClubRequestSchema.parse(input);
      return http.request({
        path: "/players/me/external-club",
        method: "POST",
        body,
        options,
        parse: (data) => associateMyPlayerExternalClubResponseSchema.parse(data),
      });
    },

    async getNextEncounter(options: RequestOptions = {}): Promise<GetMyNextEncounterResponse> {
      return http.request({
        path: "/players/me/next-encounter",
        method: "GET",
        options,
        parse: (data) => getMyNextEncounterResponseSchema.parse(data),
      });
    },

    async listTeams(options: RequestOptions = {}): Promise<GetMyTeamsResponse> {
      return http.request({
        path: "/players/me/teams",
        method: "GET",
        options,
        parse: (data) => getMyTeamsResponseSchema.parse(data),
      });
    },

    async setActiveTeam(
      input: SetActiveTeamRequest,
      options: RequestOptions = {},
    ): Promise<SetActiveTeamResponse> {
      const body = setActiveTeamRequestSchema.parse(input);
      return http.request({
        path: "/players/me/active-team",
        method: "PUT",
        body,
        options,
        parse: (data) => setActiveTeamResponseSchema.parse(data),
      });
    },
  };
}

export type PlayersResource = ReturnType<typeof createPlayersResource>;
