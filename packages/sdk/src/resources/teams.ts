import {
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
  addToRosterRequestSchema,
  addToRosterResponseSchema,
  createTeamRequestSchema,
  createTeamResponseSchema,
  getMyPlayerProfileResponseSchema,
  getMyTeamsResponseSchema,
  setActiveTeamRequestSchema,
  setActiveTeamResponseSchema,
  type AddMyPlayerGameAccountRequest,
  type AddMyPlayerGameAccountResponse,
  type AddToRosterRequest,
  type AddToRosterResponse,
  type CreateTeamRequest,
  type CreateTeamResponse,
  type GetMyPlayerProfileResponse,
  type GetMyTeamsResponse,
  type SetActiveTeamRequest,
  type SetActiveTeamResponse,
} from "@futrob/api-contracts";
import type { HttpClient } from "../http.ts";

export function createTeamsResource(http: HttpClient) {
  return {
    async getMyProfile(): Promise<GetMyPlayerProfileResponse> {
      return http.request({
        path: "/players/me",
        method: "GET",
        parse: (data) => getMyPlayerProfileResponseSchema.parse(data),
      });
    },

    async addMyGameAccount(
      input: AddMyPlayerGameAccountRequest,
    ): Promise<AddMyPlayerGameAccountResponse> {
      const body = addMyPlayerGameAccountRequestSchema.parse(input);
      return http.request({
        path: "/players/me/game-accounts",
        method: "POST",
        body,
        parse: (data) => addMyPlayerGameAccountResponseSchema.parse(data),
      });
    },

    async getMyTeams(): Promise<GetMyTeamsResponse> {
      return http.request({
        path: "/players/me/teams",
        method: "GET",
        parse: (data) => getMyTeamsResponseSchema.parse(data),
      });
    },

    async setActiveTeam(input: SetActiveTeamRequest): Promise<SetActiveTeamResponse> {
      const body = setActiveTeamRequestSchema.parse(input);
      return http.request({
        path: "/players/me/active-team",
        method: "PUT",
        body,
        parse: (data) => setActiveTeamResponseSchema.parse(data),
      });
    },

    async createTeam(
      organizationId: string,
      input: CreateTeamRequest,
    ): Promise<CreateTeamResponse> {
      const body = createTeamRequestSchema.parse(input);
      return http.request({
        path: `/organizations/${organizationId}/teams`,
        method: "POST",
        body,
        parse: (data) => createTeamResponseSchema.parse(data),
      });
    },

    async addToRoster(
      organizationId: string,
      competitionId: string,
      teamId: string,
      input: AddToRosterRequest,
    ): Promise<AddToRosterResponse> {
      const body = addToRosterRequestSchema.parse(input);
      return http.request({
        path: `/organizations/${organizationId}/competitions/${competitionId}/teams/${teamId}/roster`,
        method: "POST",
        body,
        parse: (data) => addToRosterResponseSchema.parse(data),
      });
    },
  };
}

export type TeamsResource = ReturnType<typeof createTeamsResource>;
