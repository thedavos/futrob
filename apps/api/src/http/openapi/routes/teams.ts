import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  AddToRosterRequest,
  ChangeRosterRoleRequest,
  CompetitionRosterMembership,
  CompetitionTeamManagementDetail,
  ConnectTeamExternalClubRequest,
  CreateRosterInvitationRequest,
  CreateRosterInvitationResponse,
  CreateTeamRequest,
  GetMyTeamsResponse,
  GetTeamExternalClubResponse,
  ListRosterResponse,
  RosterState,
  SetActiveTeamRequest,
  SetActiveTeamResponse,
  Team,
  TeamExternalClubConnection,
} from "@/http/openapi/components.ts";
import {
  competitionTeamManagementListQuerySchema,
  competitionTeamManagementListResponseSchema,
  listOrganizationTeamsResponseSchema,
} from "@futrob/api-contracts";

export const getMyTeamsRoute = defineRoute({
  method: "get",
  path: "/players/me/teams",
  operationId: "getMyTeams",
  tags: ["teams"],
  summary: "List roster memberships of the authenticated player",
  success: {
    status: 200,
    description: "Memberships and the active roster id",
    schema: GetMyTeamsResponse,
  },
  errors: [401],
});

export const setMyActiveTeamRoute = defineRoute({
  method: "put",
  path: "/players/me/active-team",
  operationId: "setMyActiveTeam",
  tags: ["teams"],
  summary: "Select the authenticated player's active roster membership",
  body: SetActiveTeamRequest,
  success: {
    status: 200,
    description: "Persisted active roster membership",
    schema: SetActiveTeamResponse,
  },
  errors: [400, 401, 403, 404],
});

export const listTeamRosterRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/teams/{teamId}/roster",
  operationId: "listTeamRoster",
  tags: ["teams"],
  summary: "List authorized roster memberships for a competition team",
  params: pathParams(["organizationId", "competitionId", "teamId"]),
  success: { status: 200, description: "Roster memberships", schema: ListRosterResponse },
  errors: [401, 403],
});

export const addToTeamRosterRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/teams/{teamId}/roster",
  operationId: "addToTeamRoster",
  tags: ["teams"],
  summary: "Add a player profile to a competition team roster",
  params: pathParams(["organizationId", "competitionId", "teamId"]),
  body: AddToRosterRequest,
  success: { status: 201, description: "Created membership", schema: CompetitionRosterMembership },
  errors: [400, 401, 403, 404, 409],
});

export const changeRosterRoleRoute = defineRoute({
  method: "patch",
  path: "/organizations/{organizationId}/competitions/{competitionId}/teams/{teamId}/roster/{membershipId}",
  operationId: "changeRosterRole",
  tags: ["teams"],
  summary: "Change the role of a roster membership",
  params: pathParams(["organizationId", "competitionId", "teamId", "membershipId"]),
  body: ChangeRosterRoleRequest,
  success: { status: 200, description: "Updated membership", schema: CompetitionRosterMembership },
  errors: [400, 401, 403, 404],
});

export const closeTeamRosterRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/teams/{teamId}/roster/close",
  operationId: "closeTeamRoster",
  tags: ["teams"],
  summary: "Lock the competition team roster",
  params: pathParams(["organizationId", "competitionId", "teamId"]),
  success: { status: 200, description: "Locked roster state", schema: RosterState },
  errors: [401, 403, 409],
});

export const openTeamRosterRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/teams/{teamId}/roster/open",
  operationId: "openTeamRoster",
  tags: ["teams"],
  summary: "Unlock the competition team roster",
  params: pathParams(["organizationId", "competitionId", "teamId"]),
  success: { status: 200, description: "Unlocked roster state", schema: RosterState },
  errors: [401, 403, 409],
});

export const getOrganizationTeamExternalClubRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/teams/{teamId}/external-club",
  operationId: "getOrganizationTeamExternalClub",
  tags: ["teams"],
  summary: "Read the organization team's linked external club",
  params: pathParams(["organizationId", "teamId"]),
  success: { status: 200, description: "Connection or null", schema: GetTeamExternalClubResponse },
  errors: [401, 403],
});

export const connectOrganizationTeamExternalClubRoute = defineRoute({
  method: "put",
  path: "/organizations/{organizationId}/teams/{teamId}/external-club",
  operationId: "connectOrganizationTeamExternalClub",
  tags: ["teams"],
  summary: "Link an external club to an organization team",
  params: pathParams(["organizationId", "teamId"]),
  body: ConnectTeamExternalClubRequest,
  success: { status: 200, description: "Persisted connection", schema: TeamExternalClubConnection },
  errors: [400, 401, 403, 404],
});

export const getCompetitionTeamExternalClubRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/teams/{teamId}/external-club",
  operationId: "getCompetitionTeamExternalClub",
  tags: ["teams"],
  summary: "Read the competition team's linked external club",
  params: pathParams(["organizationId", "competitionId", "teamId"]),
  success: { status: 200, description: "Connection or null", schema: GetTeamExternalClubResponse },
  errors: [401, 403],
});

export const connectCompetitionTeamExternalClubRoute = defineRoute({
  method: "put",
  path: "/organizations/{organizationId}/competitions/{competitionId}/teams/{teamId}/external-club",
  operationId: "connectCompetitionTeamExternalClub",
  tags: ["teams"],
  summary: "Link an external club to a competition team",
  params: pathParams(["organizationId", "competitionId", "teamId"]),
  body: ConnectTeamExternalClubRequest,
  success: { status: 200, description: "Persisted connection", schema: TeamExternalClubConnection },
  errors: [400, 401, 403, 404],
});

export const createRosterInvitationRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/teams/{teamId}/roster-invitations",
  operationId: "createRosterInvitation",
  tags: ["teams"],
  summary: "Create a roster invitation for a competition team",
  params: pathParams(["organizationId", "competitionId", "teamId"]),
  body: CreateRosterInvitationRequest,
  success: {
    status: 201,
    description: "Created invitation including the one-time token",
    schema: CreateRosterInvitationResponse,
  },
  errors: [400, 401, 403, 409],
});

export const listOrganizationTeamsRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/teams",
  operationId: "listOrganizationTeams",
  tags: ["teams"],
  summary: "List teams available to the organization operator",
  params: pathParams(["organizationId"]),
  success: { status: 200, description: "Teams", schema: listOrganizationTeamsResponseSchema },
  errors: [401, 403],
});

export const createOrganizationTeamRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/teams",
  operationId: "createOrganizationTeam",
  tags: ["teams"],
  summary: "Create a team in the organization",
  params: pathParams(["organizationId"]),
  body: CreateTeamRequest,
  success: { status: 201, description: "Created team", schema: Team },
  errors: [400, 401, 403, 409],
});

export const listCompetitionTeamManagementRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/team-management",
  operationId: "listCompetitionTeamManagement",
  tags: ["teams"],
  summary: "List competition Teams with roster management state",
  params: pathParams(["organizationId", "competitionId"]),
  query: competitionTeamManagementListQuerySchema,
  success: {
    status: 200,
    description: "Visible Team management summaries",
    schema: competitionTeamManagementListResponseSchema,
  },
  errors: [400, 403],
});

export const getCompetitionTeamManagementRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/team-management/{teamId}",
  operationId: "getCompetitionTeamManagement",
  tags: ["teams"],
  summary: "Get a competition Team roster management detail",
  params: pathParams(["organizationId", "competitionId", "teamId"]),
  success: {
    status: 200,
    description: "Team roster management detail",
    schema: CompetitionTeamManagementDetail,
  },
  errors: [403, 404],
});
