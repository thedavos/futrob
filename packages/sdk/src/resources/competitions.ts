import {
  acceptCompetitionInvitationResponseSchema,
  acceptInvitationRequestSchema,
  createCompetitionDraftRequestSchema,
  createCompetitionDraftResponseSchema,
  exploreCompetitionsQuerySchema,
  exploreCompetitionsResponseSchema,
  getCompetitionDraftResponseSchema,
  getExploreCompetitionResponseSchema,
  listOrganizationCompetitionsResponseSchema,
  listAccessibleCompetitionsResponseSchema,
  registerTeamEntryRequestSchema,
  registerTeamEntryResponseSchema,
  type AcceptCompetitionInvitationResponse,
  type AcceptInvitationRequest,
  type CreateCompetitionDraftRequest,
  type CreateCompetitionDraftResponse,
  type ExploreCompetitionsQueryInput,
  type ExploreCompetitionsResponse,
  type GetCompetitionDraftResponse,
  type GetExploreCompetitionResponse,
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
  competitionRegistrationResponseSchema,
  updateCompetitionCoverRequestSchema,
  updateCompetitionCoverResponseSchema,
  type UpdateCompetitionCoverRequest,
  type UpdateCompetitionCoverResponse,
  applyToCompetitionRequestSchema,
  applyToCompetitionResponseSchema,
  getMyCompetitionApplicationResponseSchema,
  type ApplyToCompetitionRequest,
  type ApplyToCompetitionResponse,
  type GetMyCompetitionApplicationResponse,
  type CompetitionRegistrationResponse,
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
    async explore(
      query: ExploreCompetitionsQueryInput = {},
      options: RequestOptions = {},
    ): Promise<ExploreCompetitionsResponse> {
      const parsed = exploreCompetitionsQuerySchema.parse(query);
      const search = new URLSearchParams();
      if (parsed.q) search.set("q", parsed.q);
      if (parsed.format) search.set("format", parsed.format);
      if (parsed.status) search.set("status", parsed.status);
      if (parsed.region) search.set("region", parsed.region);
      if (parsed.platform) search.set("platform", parsed.platform);
      search.set("sort", parsed.sort);
      search.set("limit", String(parsed.limit));
      if (parsed.cursor) search.set("cursor", parsed.cursor);
      return http.request({
        path: `/competitions/explore?${search.toString()}`,
        method: "GET",
        options,
        parse: (data) => exploreCompetitionsResponseSchema.parse(data),
      });
    },

    async getExplore(
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<GetExploreCompetitionResponse> {
      return http.request({
        path: apiPath("competitions", "explore", competitionId),
        method: "GET",
        options,
        parse: (data) => getExploreCompetitionResponseSchema.parse(data),
      });
    },

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

    async updateCover(
      organizationId: string,
      competitionId: string,
      input: UpdateCompetitionCoverRequest,
      options: RequestOptions = {},
    ): Promise<UpdateCompetitionCoverResponse> {
      const body = updateCompetitionCoverRequestSchema.parse(input);
      return http.request({
        path: apiPath("organizations", organizationId, "competitions", competitionId, "cover"),
        method: "PUT",
        body,
        options,
        parse: (data) => updateCompetitionCoverResponseSchema.parse(data),
      });
    },

    async getMyApplication(
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<GetMyCompetitionApplicationResponse> {
      return http.request({
        path: apiPath("competitions", "explore", competitionId, "application"),
        method: "GET",
        options,
        parse: (data) => getMyCompetitionApplicationResponseSchema.parse(data),
      });
    },

    async apply(
      competitionId: string,
      input: ApplyToCompetitionRequest,
      options: RequestOptions = {},
    ): Promise<ApplyToCompetitionResponse> {
      const body = applyToCompetitionRequestSchema.parse(input);
      return http.request({
        path: apiPath("competitions", "explore", competitionId, "application"),
        method: "POST",
        body,
        options,
        parse: (data) => applyToCompetitionResponseSchema.parse(data),
      });
    },

    async openRegistration(
      organizationId: string,
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<CompetitionRegistrationResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "registration",
          "open",
        ),
        method: "POST",
        options,
        parse: (data) => competitionRegistrationResponseSchema.parse(data),
      });
    },

    async closeRegistration(
      organizationId: string,
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<CompetitionRegistrationResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "registration",
          "close",
        ),
        method: "POST",
        options,
        parse: (data) => competitionRegistrationResponseSchema.parse(data),
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
