import {
  getMyPlayerProfileResponseSchema,
  getMyTeamsResponseSchema,
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
  associateMyPlayerExternalClubRequestSchema,
  associateMyPlayerExternalClubResponseSchema,
  setActiveTeamRequestSchema,
  setActiveTeamResponseSchema,
  type GetMyPlayerProfileResponse,
  type GetMyTeamsResponse,
  type AddMyPlayerGameAccountRequest,
  type AddMyPlayerGameAccountResponse,
  type AssociateMyPlayerExternalClubRequest,
  type AssociateMyPlayerExternalClubResponse,
  type SetActiveTeamRequest,
  type SetActiveTeamResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";

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
