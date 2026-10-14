import {
  addToRosterRequestSchema,
  changeRosterRoleRequestSchema,
  closeRosterResponseSchema,
  connectTeamExternalClubRequestSchema,
  createRosterInvitationRequestSchema,
  createRosterInvitationResponseSchema,
  createTeamRequestSchema,
  getTeamExternalClubResponseSchema,
  listRosterResponseSchema,
  teamExternalClubConnectionSchema,
  competitionRosterMembershipSchema,
} from "../teams/schemas.ts";
import {
  API_ERROR_RESPONSE,
  competitionIdParam,
  jsonContent,
  membershipIdParam,
  organizationIdParam,
  teamIdParam,
  zodOpenApiSchema,
} from "./openapi-fragments.ts";

const ROSTER = "/organizations/{organizationId}/competitions/{competitionId}/teams/{teamId}/roster";
const ORG_CLUB = "/organizations/{organizationId}/teams/{teamId}/external-club";
const COMP_CLUB =
  "/organizations/{organizationId}/competitions/{competitionId}/teams/{teamId}/external-club";

const teamScope = [organizationIdParam, competitionIdParam, teamIdParam];
const orgTeamScope = [organizationIdParam, teamIdParam];

export const teamRosterOpenApiPaths = {
  [ROSTER]: {
    get: {
      operationId: "listTeamRoster",
      tags: ["teams"],
      summary: "List authorized roster memberships for a competition team",
      parameters: [...teamScope],
      responses: {
        "200": {
          description: "Roster memberships",
          content: jsonContent("ListRosterResponse"),
        },
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
      },
    },
    post: {
      operationId: "addToTeamRoster",
      tags: ["teams"],
      summary: "Add a player profile to a competition team roster",
      parameters: [...teamScope],
      requestBody: { required: true, content: jsonContent("AddToRosterRequest") },
      responses: {
        "201": {
          description: "Created membership",
          content: jsonContent("CompetitionRosterMembership"),
        },
        "400": API_ERROR_RESPONSE,
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "404": API_ERROR_RESPONSE,
        "409": API_ERROR_RESPONSE,
      },
    },
  },
  [`${ROSTER}/{membershipId}`]: {
    patch: {
      operationId: "changeRosterRole",
      tags: ["teams"],
      summary: "Change the role of a roster membership",
      parameters: [...teamScope, membershipIdParam],
      requestBody: { required: true, content: jsonContent("ChangeRosterRoleRequest") },
      responses: {
        "200": {
          description: "Updated membership",
          content: jsonContent("CompetitionRosterMembership"),
        },
        "400": API_ERROR_RESPONSE,
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "404": API_ERROR_RESPONSE,
      },
    },
  },
  [`${ROSTER}/close`]: {
    post: {
      operationId: "closeTeamRoster",
      tags: ["teams"],
      summary: "Lock the competition team roster",
      parameters: [...teamScope],
      responses: {
        "200": {
          description: "Locked roster state",
          content: jsonContent("RosterState"),
        },
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "409": API_ERROR_RESPONSE,
      },
    },
  },
  [`${ROSTER}/open`]: {
    post: {
      operationId: "openTeamRoster",
      tags: ["teams"],
      summary: "Unlock the competition team roster",
      parameters: [...teamScope],
      responses: {
        "200": {
          description: "Unlocked roster state",
          content: jsonContent("RosterState"),
        },
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "409": API_ERROR_RESPONSE,
      },
    },
  },
  [ORG_CLUB]: {
    get: {
      operationId: "getOrganizationTeamExternalClub",
      tags: ["teams"],
      summary: "Read the organization team's linked external club",
      parameters: [...orgTeamScope],
      responses: {
        "200": {
          description: "Connection or null",
          content: jsonContent("GetTeamExternalClubResponse"),
        },
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
      },
    },
    put: {
      operationId: "connectOrganizationTeamExternalClub",
      tags: ["teams"],
      summary: "Link an external club to an organization team",
      parameters: [...orgTeamScope],
      requestBody: { required: true, content: jsonContent("ConnectTeamExternalClubRequest") },
      responses: {
        "200": {
          description: "Persisted connection",
          content: jsonContent("TeamExternalClubConnection"),
        },
        "400": API_ERROR_RESPONSE,
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "404": API_ERROR_RESPONSE,
      },
    },
  },
  [COMP_CLUB]: {
    get: {
      operationId: "getCompetitionTeamExternalClub",
      tags: ["teams"],
      summary: "Read the competition team's linked external club",
      parameters: [...teamScope],
      responses: {
        "200": {
          description: "Connection or null",
          content: jsonContent("GetTeamExternalClubResponse"),
        },
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
      },
    },
    put: {
      operationId: "connectCompetitionTeamExternalClub",
      tags: ["teams"],
      summary: "Link an external club to a competition team",
      parameters: [...teamScope],
      requestBody: { required: true, content: jsonContent("ConnectTeamExternalClubRequest") },
      responses: {
        "200": {
          description: "Persisted connection",
          content: jsonContent("TeamExternalClubConnection"),
        },
        "400": API_ERROR_RESPONSE,
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "404": API_ERROR_RESPONSE,
      },
    },
  },
  [`${ROSTER}-invitations`]: {
    post: {
      operationId: "createRosterInvitation",
      tags: ["teams"],
      summary: "Create a roster invitation for a competition team",
      parameters: [...teamScope],
      requestBody: { required: true, content: jsonContent("CreateRosterInvitationRequest") },
      responses: {
        "201": {
          description: "Created invitation including the one-time token",
          content: jsonContent("CreateRosterInvitationResponse"),
        },
        "400": API_ERROR_RESPONSE,
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "409": API_ERROR_RESPONSE,
      },
    },
  },
} as const;

export const teamRosterOpenApiSchemas = {
  CreateTeamRequest: zodOpenApiSchema(createTeamRequestSchema, "input"),
  CompetitionRosterMembership: zodOpenApiSchema(competitionRosterMembershipSchema, "output"),
  ListRosterResponse: zodOpenApiSchema(listRosterResponseSchema, "output"),
  AddToRosterRequest: zodOpenApiSchema(addToRosterRequestSchema, "input"),
  ChangeRosterRoleRequest: zodOpenApiSchema(changeRosterRoleRequestSchema, "input"),
  RosterState: zodOpenApiSchema(closeRosterResponseSchema, "output"),
  ConnectTeamExternalClubRequest: zodOpenApiSchema(connectTeamExternalClubRequestSchema, "input"),
  TeamExternalClubConnection: zodOpenApiSchema(teamExternalClubConnectionSchema, "output"),
  GetTeamExternalClubResponse: zodOpenApiSchema(getTeamExternalClubResponseSchema, "output"),
  CreateRosterInvitationRequest: zodOpenApiSchema(createRosterInvitationRequestSchema, "input"),
  CreateRosterInvitationResponse: zodOpenApiSchema(createRosterInvitationResponseSchema, "output"),
};
