import {
  acceptCompetitionInvitationResponseSchema,
  acceptInvitationRequestSchema,
  createCompetitionDraftRequestSchema,
  createCompetitionDraftResponseSchema,
  getCompetitionDraftResponseSchema,
  listOrganizationCompetitionsResponseSchema,
  registerTeamEntryRequestSchema,
  registerTeamEntryResponseSchema,
  type AcceptCompetitionInvitationResponse,
  type AcceptInvitationRequest,
  type CreateCompetitionDraftRequest,
  type CreateCompetitionDraftResponse,
  type GetCompetitionDraftResponse,
  type ListOrganizationCompetitionsResponse,
  type RegisterTeamEntryRequest,
  type RegisterTeamEntryResponse,
  updateCompetitionDraftRequestSchema,
  updateCompetitionDraftResponseSchema,
  competitionParticipantInputSchema,
  listCompetitionParticipantsResponseSchema,
  addCompetitionParticipantResponseSchema,
  publishCompetitionResponseSchema,
  type UpdateCompetitionDraftRequest,
  type UpdateCompetitionDraftResponse,
  type CompetitionParticipantInput,
  type ListCompetitionParticipantsResponse,
  type AddCompetitionParticipantResponse,
  type PublishCompetitionResponse,
} from "@futrob/api-contracts";
import type { HttpClient } from "../http.ts";

export function createCompetitionsResource(http: HttpClient) {
  return {
    async list(organizationId: string): Promise<ListOrganizationCompetitionsResponse> {
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions`,
        method: "GET",
        parse: (data) => listOrganizationCompetitionsResponseSchema.parse(data),
      });
    },

    async createDraft(
      organizationId: string,
      input: CreateCompetitionDraftRequest,
    ): Promise<CreateCompetitionDraftResponse> {
      const body = createCompetitionDraftRequestSchema.parse(input);
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions`,
        method: "POST",
        body,
        parse: (data) => createCompetitionDraftResponseSchema.parse(data),
      });
    },

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

    async updateDraft(
      organizationId: string,
      competitionId: string,
      input: UpdateCompetitionDraftRequest,
    ): Promise<UpdateCompetitionDraftResponse> {
      const body = updateCompetitionDraftRequestSchema.parse(input);
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}`,
        method: "PATCH",
        body,
        parse: (data) => updateCompetitionDraftResponseSchema.parse(data),
      });
    },

    async listParticipants(
      organizationId: string,
      competitionId: string,
    ): Promise<ListCompetitionParticipantsResponse> {
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/participants`,
        method: "GET",
        parse: (data) => listCompetitionParticipantsResponseSchema.parse(data),
      });
    },

    async addParticipant(
      organizationId: string,
      competitionId: string,
      input: CompetitionParticipantInput,
    ): Promise<AddCompetitionParticipantResponse> {
      const body = competitionParticipantInputSchema.parse(input);
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/participants`,
        method: "POST",
        body,
        parse: (data) => addCompetitionParticipantResponseSchema.parse(data),
      });
    },

    async removeParticipant(
      organizationId: string,
      competitionId: string,
      entryId: string,
    ): Promise<void> {
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/participants/${encodeURIComponent(entryId)}`,
        method: "DELETE",
        parse: () => undefined,
      });
    },

    async publish(
      organizationId: string,
      competitionId: string,
    ): Promise<PublishCompetitionResponse> {
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/publish`,
        method: "POST",
        parse: (data) => publishCompetitionResponseSchema.parse(data),
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
