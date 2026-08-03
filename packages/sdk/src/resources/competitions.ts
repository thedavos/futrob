import {
  acceptCompetitionInvitationResponseSchema,
  acceptInvitationRequestSchema,
  getCompetitionDraftResponseSchema,
  registerTeamEntryRequestSchema,
  registerTeamEntryResponseSchema,
  type AcceptCompetitionInvitationResponse,
  type AcceptInvitationRequest,
  type GetCompetitionDraftResponse,
  type RegisterTeamEntryRequest,
  type RegisterTeamEntryResponse,
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

    async registerTeamEntry(
      organizationId: string,
      competitionId: string,
      input: RegisterTeamEntryRequest,
    ): Promise<RegisterTeamEntryResponse> {
      const body = registerTeamEntryRequestSchema.parse(input);
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/entries`,
        method: "POST",
        body,
        parse: (data) => registerTeamEntryResponseSchema.parse(data),
      });
    },
  };
}

export type CompetitionsResource = ReturnType<typeof createCompetitionsResource>;
