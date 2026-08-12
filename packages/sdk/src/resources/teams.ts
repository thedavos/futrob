import {
  acceptRosterInvitationRequestSchema,
  acceptRosterInvitationResponseSchema,
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
  addToRosterRequestSchema,
  addToRosterResponseSchema,
  changeRosterRoleRequestSchema,
  changeRosterRoleResponseSchema,
  closeRosterResponseSchema,
  connectTeamExternalClubRequestSchema,
  connectTeamExternalClubResponseSchema,
  createRosterInvitationRequestSchema,
  createRosterInvitationResponseSchema,
  createTeamRequestSchema,
  createTeamResponseSchema,
  getMyPlayerProfileResponseSchema,
  getMyTeamsResponseSchema,
  getTeamExternalClubResponseSchema,
  listOrganizationTeamsResponseSchema,
  listRosterResponseSchema,
  openRosterResponseSchema,
  setActiveTeamRequestSchema,
  setActiveTeamResponseSchema,
  type AcceptRosterInvitationRequest,
  type AcceptRosterInvitationResponse,
  type AddMyPlayerGameAccountRequest,
  type AddMyPlayerGameAccountResponse,
  type AddToRosterRequest,
  type AddToRosterResponse,
  type ChangeRosterRoleRequest,
  type ChangeRosterRoleResponse,
  competitionTeamManagementDetailResponseSchema,
  competitionTeamManagementListQuerySchema,
  competitionTeamManagementListResponseSchema,
  type CompetitionTeamManagementDetailResponse,
  type CompetitionTeamManagementListQuery,
  type CompetitionTeamManagementListResponse,
  type CloseRosterResponse,
  type ConnectTeamExternalClubRequest,
  type ConnectTeamExternalClubResponse,
  type CreateRosterInvitationRequestInput,
  type CreateRosterInvitationResponse,
  type CreateTeamRequest,
  type CreateTeamResponse,
  type GetMyPlayerProfileResponse,
  type GetMyTeamsResponse,
  type GetTeamExternalClubResponse,
  type ListOrganizationTeamsResponse,
  type ListRosterResponse,
  type OpenRosterResponse,
  type SetActiveTeamRequest,
  type SetActiveTeamResponse,
} from "@futrob/api-contracts";
import type { HttpClient } from "../http.ts";

export function createTeamsResource(http: HttpClient) {
  return {
    async listCompetitionManagement(
      organizationId: string,
      competitionId: string,
      query: CompetitionTeamManagementListQuery = { limit: 25 },
    ): Promise<CompetitionTeamManagementListResponse> {
      const parsed = competitionTeamManagementListQuerySchema.parse(query);
      const search = new URLSearchParams({ limit: String(parsed.limit) });
      if (parsed.cursor) search.set("cursor", parsed.cursor);
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/team-management?${search.toString()}`,
        method: "GET",
        parse: (data) => competitionTeamManagementListResponseSchema.parse(data),
      });
    },

    async getCompetitionTeamManagement(
      organizationId: string,
      competitionId: string,
      teamId: string,
    ): Promise<CompetitionTeamManagementDetailResponse> {
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/team-management/${encodeURIComponent(teamId)}`,
        method: "GET",
        parse: (data) => competitionTeamManagementDetailResponseSchema.parse(data),
      });
    },

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

    async getMyTeams(): Promise<GetMyTeamsResponse> {
      return http.request({
        path: "/players/me/teams",
        method: "GET",
        parse: (data) => getMyTeamsResponseSchema.parse(data),
      });
    },

    async setActiveTeam(input: SetActiveTeamRequest): Promise<SetActiveTeamResponse> {
      const body = setActiveTeamRequestSchema.parse(input);
      return http.request({
        path: "/players/me/active-team",
        method: "PUT",
        body,
        parse: (data) => setActiveTeamResponseSchema.parse(data),
      });
    },

    async createTeam(
      organizationId: string,
      input: CreateTeamRequest,
    ): Promise<CreateTeamResponse> {
      const body = createTeamRequestSchema.parse(input);
      return http.request({
        path: `/organizations/${organizationId}/teams`,
        method: "POST",
        body,
        parse: (data) => createTeamResponseSchema.parse(data),
      });
    },

    async listByOrganization(organizationId: string): Promise<ListOrganizationTeamsResponse> {
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/teams`,
        method: "GET",
        parse: (data) => listOrganizationTeamsResponseSchema.parse(data),
      });
    },

    async listRoster(
      organizationId: string,
      competitionId: string,
      teamId: string,
    ): Promise<ListRosterResponse> {
      return http.request({
        path: `/organizations/${organizationId}/competitions/${competitionId}/teams/${teamId}/roster`,
        method: "GET",
        parse: (data) => listRosterResponseSchema.parse(data),
      });
    },

    async addToRoster(
      organizationId: string,
      competitionId: string,
      teamId: string,
      input: AddToRosterRequest,
    ): Promise<AddToRosterResponse> {
      const body = addToRosterRequestSchema.parse(input);
      return http.request({
        path: `/organizations/${organizationId}/competitions/${competitionId}/teams/${teamId}/roster`,
        method: "POST",
        body,
        parse: (data) => addToRosterResponseSchema.parse(data),
      });
    },

    async changeRosterRole(
      organizationId: string,
      competitionId: string,
      teamId: string,
      membershipId: string,
      input: ChangeRosterRoleRequest,
    ): Promise<ChangeRosterRoleResponse> {
      const body = changeRosterRoleRequestSchema.parse(input);
      return http.request({
        path: `/organizations/${organizationId}/competitions/${competitionId}/teams/${teamId}/roster/${membershipId}`,
        method: "PATCH",
        body,
        parse: (data) => changeRosterRoleResponseSchema.parse(data),
      });
    },

    async closeRoster(
      organizationId: string,
      competitionId: string,
      teamId: string,
    ): Promise<CloseRosterResponse> {
      return http.request({
        path: `/organizations/${organizationId}/competitions/${competitionId}/teams/${teamId}/roster/close`,
        method: "POST",
        parse: (data) => closeRosterResponseSchema.parse(data),
      });
    },

    async openRoster(
      organizationId: string,
      competitionId: string,
      teamId: string,
    ): Promise<OpenRosterResponse> {
      return http.request({
        path: `/organizations/${organizationId}/competitions/${competitionId}/teams/${teamId}/roster/open`,
        method: "POST",
        parse: (data) => openRosterResponseSchema.parse(data),
      });
    },

    async connectExternalClub(
      organizationId: string,
      competitionId: string,
      teamId: string,
      input: ConnectTeamExternalClubRequest,
    ): Promise<ConnectTeamExternalClubResponse> {
      const body = connectTeamExternalClubRequestSchema.parse(input);
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/teams/${encodeURIComponent(teamId)}/external-club`,
        method: "PUT",
        body,
        parse: (data) => connectTeamExternalClubResponseSchema.parse(data),
      });
    },

    async getExternalClub(
      organizationId: string,
      competitionId: string,
      teamId: string,
    ): Promise<GetTeamExternalClubResponse> {
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/teams/${encodeURIComponent(teamId)}/external-club`,
        method: "GET",
        parse: (data) => getTeamExternalClubResponseSchema.parse(data),
      });
    },

    async createRosterInvitation(
      organizationId: string,
      competitionId: string,
      teamId: string,
      input: CreateRosterInvitationRequestInput = {},
    ): Promise<CreateRosterInvitationResponse> {
      const body = createRosterInvitationRequestSchema.parse(input);
      return http.request({
        path: `/organizations/${organizationId}/competitions/${competitionId}/teams/${teamId}/roster-invitations`,
        method: "POST",
        body,
        parse: (data) => createRosterInvitationResponseSchema.parse(data),
      });
    },

    async acceptRosterInvitation(
      input: AcceptRosterInvitationRequest,
    ): Promise<AcceptRosterInvitationResponse> {
      const body = acceptRosterInvitationRequestSchema.parse(input);
      return http.request({
        path: "/roster-invitations/accept",
        method: "POST",
        body,
        parse: (data) => acceptRosterInvitationResponseSchema.parse(data),
      });
    },
  };
}

export type TeamsResource = ReturnType<typeof createTeamsResource>;
