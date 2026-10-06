import {
  proposeOfficialSelectionRequestSchema,
  type ProposeOfficialSelectionRequest,
  confirmOfficialSelectionRequestSchema,
  type ConfirmOfficialSelectionRequest,
  rejectOfficialSelectionRequestSchema,
  type RejectOfficialSelectionRequest,
  proposeAlternativeOfficialSelectionRequestSchema,
  type ProposeAlternativeOfficialSelectionRequest,
  openMatchDisputeRequestSchema,
  type OpenMatchDisputeRequest,
  getTeamOfficialSelectionQuerySchema,
  officialSelectionViewSchema,
  officialSelectionCommandResponseSchema,
  type GetTeamOfficialSelectionQuery,
  type OfficialSelectionViewDto,
  type OfficialSelectionCommandResponse,
  listEncounterCandidatesResponseSchema,
  type ListEncounterCandidatesResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

export function createResultsResource(http: HttpClient) {
  return {
    async getTeamOfficialSelection(
      organizationId: string,
      encounterId: string,
      query: GetTeamOfficialSelectionQuery,
      options: RequestOptions = {},
    ): Promise<OfficialSelectionViewDto> {
      const search = new URLSearchParams(getTeamOfficialSelectionQuerySchema.parse(query));
      return http.request({
        path: `${apiPath("organizations", organizationId, "encounters", encounterId, "official-selection")}?${search}`,
        method: "GET",
        options,
        parse: (data) => officialSelectionViewSchema.parse(data),
      });
    },
    async proposeOfficialSelection(
      organizationId: string,
      encounterId: string,
      input: ProposeOfficialSelectionRequest,
      options: RequestOptions = {},
    ): Promise<OfficialSelectionCommandResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "encounters",
          encounterId,
          "official-selection",
          "proposals",
        ),
        method: "POST",
        body: proposeOfficialSelectionRequestSchema.parse(input),
        options,
        parse: (data) => officialSelectionCommandResponseSchema.parse(data),
      });
    },
    async confirmOfficialSelection(
      organizationId: string,
      encounterId: string,
      proposalId: string,
      input: ConfirmOfficialSelectionRequest,
      options: RequestOptions = {},
    ): Promise<OfficialSelectionCommandResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "encounters",
          encounterId,
          "official-selection",
          "proposals",
          proposalId,
          "confirm",
        ),
        method: "POST",
        body: confirmOfficialSelectionRequestSchema.parse(input),
        options,
        parse: (data) => officialSelectionCommandResponseSchema.parse(data),
      });
    },
    async rejectOfficialSelection(
      organizationId: string,
      encounterId: string,
      proposalId: string,
      input: RejectOfficialSelectionRequest,
      options: RequestOptions = {},
    ): Promise<OfficialSelectionCommandResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "encounters",
          encounterId,
          "official-selection",
          "proposals",
          proposalId,
          "reject",
        ),
        method: "POST",
        body: rejectOfficialSelectionRequestSchema.parse(input),
        options,
        parse: (data) => officialSelectionCommandResponseSchema.parse(data),
      });
    },
    async proposeAlternativeOfficialSelection(
      organizationId: string,
      encounterId: string,
      proposalId: string,
      input: ProposeAlternativeOfficialSelectionRequest,
      options: RequestOptions = {},
    ): Promise<OfficialSelectionCommandResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "encounters",
          encounterId,
          "official-selection",
          "proposals",
          proposalId,
          "alternative",
        ),
        method: "POST",
        body: proposeAlternativeOfficialSelectionRequestSchema.parse(input),
        options,
        parse: (data) => officialSelectionCommandResponseSchema.parse(data),
      });
    },
    async openMatchDispute(
      organizationId: string,
      encounterId: string,
      input: OpenMatchDisputeRequest,
      options: RequestOptions = {},
    ): Promise<OfficialSelectionCommandResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "encounters",
          encounterId,
          "official-selection",
          "disputes",
        ),
        method: "POST",
        body: openMatchDisputeRequestSchema.parse(input),
        options,
        parse: (data) => officialSelectionCommandResponseSchema.parse(data),
      });
    },

    async listEncounterCandidates(
      encounterId: string,
      options: RequestOptions = {},
    ): Promise<ListEncounterCandidatesResponse> {
      return http.request({
        path: apiPath("encounters", encounterId, "candidates"),
        method: "GET",
        options,
        parse: (data) => listEncounterCandidatesResponseSchema.parse(data),
      });
    },
  };
}

export type ResultsResource = ReturnType<typeof createResultsResource>;
