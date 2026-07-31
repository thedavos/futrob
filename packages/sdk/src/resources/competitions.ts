import {
  acceptCompetitionInvitationResponseSchema,
  acceptInvitationRequestSchema,
  getCompetitionDraftResponseSchema,
  type AcceptCompetitionInvitationResponse,
  type AcceptInvitationRequest,
  type GetCompetitionDraftResponse,
} from "@futrob/api-contracts";
import type { HttpClient } from "../http.ts";

export function createCompetitionsResource(http: HttpClient) {
  return {
    async getDraft(
      organizationId: string,
      competitionId: string,
    ): Promise<GetCompetitionDraftResponse> {
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}`,
        method: "GET",
        parse: (data) => getCompetitionDraftResponseSchema.parse(data),
      });
    },

    async acceptInvitation(
      input: AcceptInvitationRequest,
    ): Promise<AcceptCompetitionInvitationResponse> {
      const body = acceptInvitationRequestSchema.parse(input);
      return http.request({
        path: "/competitions/invitations/accept",
        method: "POST",
        body,
        parse: (data) => acceptCompetitionInvitationResponseSchema.parse(data),
      });
    },
  };
}

export type CompetitionsResource = ReturnType<typeof createCompetitionsResource>;
