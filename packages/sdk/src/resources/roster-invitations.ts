import {
  acceptRosterInvitationRequestSchema,
  acceptRosterInvitationResponseSchema,
  createRosterInvitationRequestSchema,
  createRosterInvitationResponseSchema,
  listMyRosterInvitationsResponseSchema,
  respondToRosterInvitationRequestSchema,
  respondToRosterInvitationResponseSchema,
  type AcceptRosterInvitationRequest,
  type AcceptRosterInvitationResponse,
  type CreateRosterInvitationRequestInput,
  type CreateRosterInvitationResponse,
  type ListMyRosterInvitationsResponse,
  type RespondToRosterInvitationRequest,
  type RespondToRosterInvitationResponse,
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

    async listMine(options: RequestOptions = {}): Promise<ListMyRosterInvitationsResponse> {
      return http.request({
        path: "/players/me/roster-invitations",
        method: "GET",
        options,
        parse: (data) => listMyRosterInvitationsResponseSchema.parse(data),
      });
    },

    async respond(
      invitationId: string,
      input: RespondToRosterInvitationRequest,
      options: RequestOptions = {},
    ): Promise<RespondToRosterInvitationResponse> {
      const body = respondToRosterInvitationRequestSchema.parse(input);
      return http.request({
        path: apiPath("roster-invitations", invitationId, "respond"),
        method: "POST",
        body,
        options,
        parse: (data) => respondToRosterInvitationResponseSchema.parse(data),
      });
    },
  };
}

export type RosterInvitationsResource = ReturnType<typeof createRosterInvitationsResource>;
