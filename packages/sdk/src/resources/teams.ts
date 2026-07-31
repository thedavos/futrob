import {
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
  getMyPlayerProfileResponseSchema,
  type AddMyPlayerGameAccountRequest,
  type AddMyPlayerGameAccountResponse,
  type GetMyPlayerProfileResponse,
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
  };
}

export type TeamsResource = ReturnType<typeof createTeamsResource>;
