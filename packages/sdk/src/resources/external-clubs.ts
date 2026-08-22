import {
  connectTeamExternalClubRequestSchema,
  connectTeamExternalClubResponseSchema,
  getTeamExternalClubResponseSchema,
  type ConnectTeamExternalClubRequest,
  type ConnectTeamExternalClubResponse,
  type GetTeamExternalClubResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/** Competition-scoped EA external-club link for a team. */
export function createTeamExternalClubsResource(http: HttpClient) {
  return {
    async connect(
      organizationId: string,
      competitionId: string,
      teamId: string,
      input: ConnectTeamExternalClubRequest,
      options: RequestOptions = {},
    ): Promise<ConnectTeamExternalClubResponse> {
      const body = connectTeamExternalClubRequestSchema.parse(input);
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "teams",
          teamId,
          "external-club",
        ),
        method: "PUT",
        body,
        options,
        parse: (data) => connectTeamExternalClubResponseSchema.parse(data),
      });
    },

    async retrieve(
      organizationId: string,
      competitionId: string,
      teamId: string,
      options: RequestOptions = {},
    ): Promise<GetTeamExternalClubResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "teams",
          teamId,
          "external-club",
        ),
        method: "GET",
        options,
        parse: (data) => getTeamExternalClubResponseSchema.parse(data),
      });
    },
  };
}

export type TeamExternalClubsResource = ReturnType<typeof createTeamExternalClubsResource>;
