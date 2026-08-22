import {
  acceptRosterInvitationRequestSchema,
  acceptRosterInvitationResponseSchema,
  createRosterInvitationRequestSchema,
  createRosterInvitationResponseSchema,
  type AcceptRosterInvitationRequest,
  type AcceptRosterInvitationResponse,
  type CreateRosterInvitationRequestInput,
  type CreateRosterInvitationResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/** Roster invitation issuance (org side) and acceptance (player side). */
export function createRosterInvitationsResource(http: HttpClient) {
  return {
    async create(
      organizationId: string,
      competitionId: string,
      teamId: string,
      input: CreateRosterInvitationRequestInput = {},
      options: RequestOptions = {},
    ): Promise<CreateRosterInvitationResponse> {
      const body = createRosterInvitationRequestSchema.parse(input);
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "teams",
          teamId,
          "roster-invitations",
        ),
        method: "POST",
        body,
        options,
        parse: (data) => createRosterInvitationResponseSchema.parse(data),
      });
    },

    async accept(
      input: AcceptRosterInvitationRequest,
      options: RequestOptions = {},
    ): Promise<AcceptRosterInvitationResponse> {
      const body = acceptRosterInvitationRequestSchema.parse(input);
      return http.request({
        path: "/roster-invitations/accept",
        method: "POST",
        body,
        options,
        parse: (data) => acceptRosterInvitationResponseSchema.parse(data),
      });
    },
  };
}

export type RosterInvitationsResource = ReturnType<typeof createRosterInvitationsResource>;
