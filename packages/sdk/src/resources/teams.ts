import {
  competitionTeamManagementDetailResponseSchema,
  competitionTeamManagementListQuerySchema,
  competitionTeamManagementListResponseSchema,
  createTeamRequestSchema,
  createTeamResponseSchema,
  listOrganizationTeamsResponseSchema,
  type AcceptRosterInvitationRequest,
  type AddMyPlayerGameAccountRequest,
  type AddToRosterRequest,
  type AssociateMyPlayerExternalClubRequest,
  type ChangeRosterRoleRequest,
  type CompetitionTeamManagementDetailResponse,
  type CompetitionTeamManagementListQuery,
  type CompetitionTeamManagementListResponse,
  type ConnectTeamExternalClubRequest,
  type CreateRosterInvitationRequestInput,
  type CreateTeamRequest,
  type CreateTeamResponse,
  type ListOrganizationTeamsResponse,
  type SetActiveTeamRequest,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";
import { createRosterInvitationsResource } from "./roster-invitations.ts";
import { createRostersResource } from "./rosters.ts";
import { createPlayersResource } from "./players.ts";
import { createTeamExternalClubsResource } from "./external-clubs.ts";

export function createTeamsResource(http: HttpClient) {
  const players = createPlayersResource(http);
  const rosters = createRostersResource(http);
  const rosterInvitations = createRosterInvitationsResource(http);
  const externalClubs = createTeamExternalClubsResource(http);

  return {
    players,
    rosters,
    rosterInvitations,
    externalClubs,

    async listCompetitionManagement(
      organizationId: string,
      competitionId: string,
      query: CompetitionTeamManagementListQuery = { limit: 25 },
      options: RequestOptions = {},
    ): Promise<CompetitionTeamManagementListResponse> {
      const parsed = competitionTeamManagementListQuerySchema.parse(query);
      const search = new URLSearchParams({ limit: String(parsed.limit) });
      if (parsed.cursor) search.set("cursor", parsed.cursor);
      return http.request({
        path: `${apiPath("organizations", organizationId, "competitions", competitionId, "team-management")}?${search.toString()}`,
        method: "GET",
        options,
        parse: (data) => competitionTeamManagementListResponseSchema.parse(data),
      });
    },

    async getCompetitionTeamManagement(
      organizationId: string,
      competitionId: string,
      teamId: string,
      options: RequestOptions = {},
    ): Promise<CompetitionTeamManagementDetailResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "team-management",
          teamId,
        ),
        method: "GET",
        options,
        parse: (data) => competitionTeamManagementDetailResponseSchema.parse(data),
      });
    },

    async createTeam(
      organizationId: string,
      input: CreateTeamRequest,
      options: RequestOptions = {},
    ): Promise<CreateTeamResponse> {
      const body = createTeamRequestSchema.parse(input);
      return http.request({
        path: apiPath("organizations", organizationId, "teams"),
        method: "POST",
        body,
        options,
        parse: (data) => createTeamResponseSchema.parse(data),
      });
    },

    async listByOrganization(
      organizationId: string,
      options: RequestOptions = {},
    ): Promise<ListOrganizationTeamsResponse> {
      return http.request({
        path: apiPath("organizations", organizationId, "teams"),
        method: "GET",
        options,
        parse: (data) => listOrganizationTeamsResponseSchema.parse(data),
      });
    },

    // Backward-compatible flat aliases over the nested resources above.
    getMyProfile: (options: RequestOptions = {}) => players.getProfile(options),

    addMyGameAccount: (input: AddMyPlayerGameAccountRequest, options: RequestOptions = {}) =>
      players.addGameAccount(input, options),

    associateMyExternalClub: (
      input: AssociateMyPlayerExternalClubRequest,
      options: RequestOptions = {},
    ) => players.associateExternalClub(input, options),

    getMyTeams: (options: RequestOptions = {}) => players.listTeams(options),

    setActiveTeam: (input: SetActiveTeamRequest, options: RequestOptions = {}) =>
      players.setActiveTeam(input, options),

    listRoster: (
      organizationId: string,
      competitionId: string,
      teamId: string,
      options: RequestOptions = {},
    ) => rosters.list(organizationId, competitionId, teamId, options),

    addToRoster: (
      organizationId: string,
      competitionId: string,
      teamId: string,
      input: AddToRosterRequest,
      options: RequestOptions = {},
    ) => rosters.add(organizationId, competitionId, teamId, input, options),

    changeRosterRole: (
      organizationId: string,
      competitionId: string,
      teamId: string,
      membershipId: string,
      input: ChangeRosterRoleRequest,
      options: RequestOptions = {},
    ) => rosters.changeRole(organizationId, competitionId, teamId, membershipId, input, options),

    closeRoster: (
      organizationId: string,
      competitionId: string,
      teamId: string,
      options: RequestOptions = {},
    ) => rosters.close(organizationId, competitionId, teamId, options),

    openRoster: (
      organizationId: string,
      competitionId: string,
      teamId: string,
      options: RequestOptions = {},
    ) => rosters.open(organizationId, competitionId, teamId, options),

    connectExternalClub: (
      organizationId: string,
      competitionId: string,
      teamId: string,
      input: ConnectTeamExternalClubRequest,
      options: RequestOptions = {},
    ) => externalClubs.connect(organizationId, competitionId, teamId, input, options),

    getExternalClub: (
      organizationId: string,
      competitionId: string,
      teamId: string,
      options: RequestOptions = {},
    ) => externalClubs.retrieve(organizationId, competitionId, teamId, options),

    createRosterInvitation: (
      organizationId: string,
      competitionId: string,
      teamId: string,
      input: CreateRosterInvitationRequestInput = {},
      options: RequestOptions = {},
    ) => rosterInvitations.create(organizationId, competitionId, teamId, input, options),

    acceptRosterInvitation: (input: AcceptRosterInvitationRequest, options: RequestOptions = {}) =>
      rosterInvitations.accept(input, options),
  };
}

export type TeamsResource = ReturnType<typeof createTeamsResource>;
