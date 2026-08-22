import {
  acceptCompetitionInvitationResponseSchema,
  acceptInvitationRequestSchema,
  createCompetitionDraftRequestSchema,
  createCompetitionDraftResponseSchema,
  getCompetitionDraftResponseSchema,
  listOrganizationCompetitionsResponseSchema,
  listAccessibleCompetitionsResponseSchema,
  registerTeamEntryRequestSchema,
  registerTeamEntryResponseSchema,
  type AcceptCompetitionInvitationResponse,
  type AcceptInvitationRequest,
  type CreateCompetitionDraftRequest,
  type CreateCompetitionDraftResponse,
  type GetCompetitionDraftResponse,
  type ListOrganizationCompetitionsResponse,
  type ListAccessibleCompetitionsResponse,
  type RegisterTeamEntryRequest,
  type RegisterTeamEntryResponse,
  updateCompetitionDraftRequestSchema,
  updateCompetitionDraftResponseSchema,
  competitionParticipantInputSchema,
  listCompetitionParticipantsResponseSchema,
  addCompetitionParticipantResponseSchema,
  publishCompetitionResponseSchema,
  decideTeamEntryResponseSchema,
  type UpdateCompetitionDraftRequest,
  type UpdateCompetitionDraftResponse,
  type CompetitionParticipantInput,
  type ListCompetitionParticipantsResponse,
  type AddCompetitionParticipantResponse,
  type PublishCompetitionResponse,
  type DecideTeamEntryResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

export function createCompetitionsResource(http: HttpClient) {
  return {
    async listMine(options: RequestOptions = {}): Promise<ListAccessibleCompetitionsResponse> {
      return http.request({
        path: "/competitions/mine",
        method: "GET",
        options,
        parse: (data) => listAccessibleCompetitionsResponseSchema.parse(data),
      });
    },

    async list(
      organizationId: string,
      options: RequestOptions = {},
    ): Promise<ListOrganizationCompetitionsResponse> {
      return http.request({
        path: apiPath("organizations", organizationId, "competitions"),
        method: "GET",
        options,
        parse: (data) => listOrganizationCompetitionsResponseSchema.parse(data),
      });
    },

    async createDraft(
      organizationId: string,
      input: CreateCompetitionDraftRequest,
      options: RequestOptions = {},
    ): Promise<CreateCompetitionDraftResponse> {
      const body = createCompetitionDraftRequestSchema.parse(input);
      return http.request({
        path: apiPath("organizations", organizationId, "competitions"),
        method: "POST",
        body,
        options,
        parse: (data) => createCompetitionDraftResponseSchema.parse(data),
      });
    },

    async getDraft(
      organizationId: string,
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<GetCompetitionDraftResponse> {
      return http.request({
        path: apiPath("organizations", organizationId, "competitions", competitionId),
        method: "GET",
        options,
        parse: (data) => getCompetitionDraftResponseSchema.parse(data),
      });
    },

    async updateDraft(
      organizationId: string,
      competitionId: string,
      input: UpdateCompetitionDraftRequest,
      options: RequestOptions = {},
    ): Promise<UpdateCompetitionDraftResponse> {
      const body = updateCompetitionDraftRequestSchema.parse(input);
      return http.request({
        path: apiPath("organizations", organizationId, "competitions", competitionId),
        method: "PATCH",
        body,
        options,
        parse: (data) => updateCompetitionDraftResponseSchema.parse(data),
      });
    },

    async listParticipants(
      organizationId: string,
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<ListCompetitionParticipantsResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "participants",
        ),
        method: "GET",
        options,
        parse: (data) => listCompetitionParticipantsResponseSchema.parse(data),
      });
    },

    async addParticipant(
      organizationId: string,
      competitionId: string,
      input: CompetitionParticipantInput,
      options: RequestOptions = {},
    ): Promise<AddCompetitionParticipantResponse> {
      const body = competitionParticipantInputSchema.parse(input);
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "participants",
        ),
        method: "POST",
        body,
        options,
        parse: (data) => addCompetitionParticipantResponseSchema.parse(data),
      });
    },

    async removeParticipant(
      organizationId: string,
      competitionId: string,
      entryId: string,
      options: RequestOptions = {},
    ): Promise<void> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "participants",
          entryId,
        ),
        method: "DELETE",
        options,
        parse: () => undefined,
      });
    },

    async publish(
      organizationId: string,
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<PublishCompetitionResponse> {
      return http.request({
        path: apiPath("organizations", organizationId, "competitions", competitionId, "publish"),
        method: "POST",
        options,
        parse: (data) => publishCompetitionResponseSchema.parse(data),
      });
    },

    async acceptInvitation(
      input: AcceptInvitationRequest,
      options: RequestOptions = {},
    ): Promise<AcceptCompetitionInvitationResponse> {
      const body = acceptInvitationRequestSchema.parse(input);
      return http.request({
        path: "/competitions/invitations/accept",
        method: "POST",
        body,
        options,
        parse: (data) => acceptCompetitionInvitationResponseSchema.parse(data),
      });
    },

    async registerTeamEntry(
      organizationId: string,
      competitionId: string,
      input: RegisterTeamEntryRequest,
      options: RequestOptions = {},
    ): Promise<RegisterTeamEntryResponse> {
      const body = registerTeamEntryRequestSchema.parse(input);
      return http.request({
        path: apiPath("organizations", organizationId, "competitions", competitionId, "entries"),
        method: "POST",
        body,
        options,
        parse: (data) => registerTeamEntryResponseSchema.parse(data),
      });
    },

    async approveTeamEntry(
      organizationId: string,
      competitionId: string,
      entryId: string,
      options: RequestOptions = {},
    ): Promise<DecideTeamEntryResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "entries",
          entryId,
          "approve",
        ),
        method: "POST",
        options,
        parse: (data) => decideTeamEntryResponseSchema.parse(data),
      });
    },

    async rejectTeamEntry(
      organizationId: string,
      competitionId: string,
      entryId: string,
      options: RequestOptions = {},
    ): Promise<DecideTeamEntryResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "entries",
          entryId,
          "reject",
        ),
        method: "POST",
        options,
        parse: (data) => decideTeamEntryResponseSchema.parse(data),
      });
    },
  };
}

export type CompetitionsResource = ReturnType<typeof createCompetitionsResource>;
