import {
  acceptRosterInvitationRequestSchema,
  acceptRosterInvitationResponseSchema,
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
  associateMyPlayerExternalClubRequestSchema,
  associateMyPlayerExternalClubResponseSchema,
  getMyPlayerProfileResponseSchema,
  getMyTeamsResponseSchema,
  setActiveTeamRequestSchema,
  setActiveTeamResponseSchema,
  type AcceptRosterInvitationRequest,
  type AcceptRosterInvitationResponse,
  type AddMyPlayerGameAccountRequest,
  type AddMyPlayerGameAccountResponse,
  type AssociateMyPlayerExternalClubRequest,
  type AssociateMyPlayerExternalClubResponse,
  type GetMyPlayerProfileResponse,
  type GetMyTeamsResponse,
  type SetActiveTeamRequest,
  type SetActiveTeamResponse,
  competitionTeamManagementDetailResponseSchema,
  competitionTeamManagementListQuerySchema,
  competitionTeamManagementListResponseSchema,
  type CompetitionTeamManagementDetailResponse,
  type CompetitionTeamManagementListQuery,
  type CompetitionTeamManagementListResponse,
  changeRosterRoleRequestSchema,
  changeRosterRoleResponseSchema,
  closeRosterResponseSchema,
  connectTeamExternalClubRequestSchema,
  connectTeamExternalClubResponseSchema,
  createRosterInvitationRequestSchema,
  createRosterInvitationResponseSchema,
  decideTeamEntryResponseSchema,
  openRosterResponseSchema,
  type ChangeRosterRoleRequest,
  type ChangeRosterRoleResponse,
  type CloseRosterResponse,
  type ConnectTeamExternalClubRequest,
  type ConnectTeamExternalClubResponse,
  type CreateRosterInvitationRequestInput,
  type CreateRosterInvitationResponse,
  type DecideTeamEntryResponse,
  type OpenRosterResponse,
  type RequestId,
} from "@futrob/api-contracts";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";
import type { z } from "zod";

export class TeamsClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: RequestId,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "TeamsClientError";
  }
}

async function requestTeamsJson<T>(input: {
  readonly path: string;
  readonly method: "GET" | "PATCH" | "POST" | "PUT";
  readonly body?: unknown;
  readonly schema: z.ZodType<T>;
}): Promise<T> {
  return requestBrowserJson({
    path: input.path,
    method: input.method,
    body: input.body,
    schema: input.schema,
    fallbackCode: "teams.client_error",
    createError: (status, error) =>
      new TeamsClientError(status, error.code, error.requestId, error.retryAfterSeconds),
  });
}

export const teamsBrowserClient = {
  listCompetitionManagement(
    organizationId: string,
    competitionId: string,
    query: CompetitionTeamManagementListQuery = { limit: 25 },
  ): Promise<CompetitionTeamManagementListResponse> {
    const parsed = competitionTeamManagementListQuerySchema.parse(query);
    const search = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) search.set("cursor", parsed.cursor);
    return requestTeamsJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/team-management?${search.toString()}`,
      method: "GET",
      schema: competitionTeamManagementListResponseSchema,
    });
  },
  getCompetitionTeamManagement(
    organizationId: string,
    competitionId: string,
    teamId: string,
  ): Promise<CompetitionTeamManagementDetailResponse> {
    return requestTeamsJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/team-management/${encodeURIComponent(teamId)}`,
      method: "GET",
      schema: competitionTeamManagementDetailResponseSchema,
    });
  },
  changeRosterRole(
    organizationId: string,
    competitionId: string,
    teamId: string,
    membershipId: string,
    input: ChangeRosterRoleRequest,
  ): Promise<ChangeRosterRoleResponse> {
    const body = changeRosterRoleRequestSchema.parse(input);
    return requestTeamsJson({
      path: competitionTeamPath(organizationId, competitionId, teamId, `roster/${membershipId}`),
      method: "PATCH",
      body,
      schema: changeRosterRoleResponseSchema,
    });
  },
  closeRoster(
    organizationId: string,
    competitionId: string,
    teamId: string,
  ): Promise<CloseRosterResponse> {
    return requestTeamsJson({
      path: competitionTeamPath(organizationId, competitionId, teamId, "roster/close"),
      method: "POST",
      schema: closeRosterResponseSchema,
    });
  },
  openRoster(
    organizationId: string,
    competitionId: string,
    teamId: string,
  ): Promise<OpenRosterResponse> {
    return requestTeamsJson({
      path: competitionTeamPath(organizationId, competitionId, teamId, "roster/open"),
      method: "POST",
      schema: openRosterResponseSchema,
    });
  },
  connectExternalClub(
    organizationId: string,
    competitionId: string,
    teamId: string,
    input: ConnectTeamExternalClubRequest,
  ): Promise<ConnectTeamExternalClubResponse> {
    const body = connectTeamExternalClubRequestSchema.parse(input);
    return requestTeamsJson({
      path: competitionTeamPath(organizationId, competitionId, teamId, "external-club"),
      method: "PUT",
      body,
      schema: connectTeamExternalClubResponseSchema,
    });
  },
  createRosterInvitation(
    organizationId: string,
    competitionId: string,
    teamId: string,
    input: CreateRosterInvitationRequestInput,
  ): Promise<CreateRosterInvitationResponse> {
    const body = createRosterInvitationRequestSchema.parse(input);
    return requestTeamsJson({
      path: competitionTeamPath(organizationId, competitionId, teamId, "roster-invitations"),
      method: "POST",
      body,
      schema: createRosterInvitationResponseSchema,
    });
  },
  decideEntry(
    organizationId: string,
    competitionId: string,
    entryId: string,
    decision: "approve" | "reject",
  ): Promise<DecideTeamEntryResponse> {
    return requestTeamsJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/entries/${encodeURIComponent(entryId)}/${decision}`,
      method: "POST",
      schema: decideTeamEntryResponseSchema,
    });
  },
  getMyProfile(): Promise<GetMyPlayerProfileResponse> {
    return requestTeamsJson({
      path: "/api/v1/players/me",
      method: "GET",
      schema: getMyPlayerProfileResponseSchema,
    });
  },
  addMyGameAccount(input: AddMyPlayerGameAccountRequest): Promise<AddMyPlayerGameAccountResponse> {
    const body = addMyPlayerGameAccountRequestSchema.parse(input);
    return requestTeamsJson({
      path: "/api/v1/players/me/game-accounts",
      method: "POST",
      body,
      schema: addMyPlayerGameAccountResponseSchema,
    });
  },
  associateMyExternalClub(
    input: AssociateMyPlayerExternalClubRequest,
  ): Promise<AssociateMyPlayerExternalClubResponse> {
    const body = associateMyPlayerExternalClubRequestSchema.parse(input);
    return requestTeamsJson({
      path: "/api/v1/players/me/external-club",
      method: "POST",
      body,
      schema: associateMyPlayerExternalClubResponseSchema,
    });
  },
  getMyTeams(): Promise<GetMyTeamsResponse> {
    return requestTeamsJson({
      path: "/api/v1/players/me/teams",
      method: "GET",
      schema: getMyTeamsResponseSchema,
    });
  },
  setActiveTeam(input: SetActiveTeamRequest): Promise<SetActiveTeamResponse> {
    const body = setActiveTeamRequestSchema.parse(input);
    return requestTeamsJson({
      path: "/api/v1/players/me/active-team",
      method: "PUT",
      body,
      schema: setActiveTeamResponseSchema,
    });
  },
  acceptRosterInvitation(
    input: AcceptRosterInvitationRequest,
  ): Promise<AcceptRosterInvitationResponse> {
    const body = acceptRosterInvitationRequestSchema.parse(input);
    return requestTeamsJson({
      path: "/api/v1/roster-invitations/accept",
      method: "POST",
      body,
      schema: acceptRosterInvitationResponseSchema,
    });
  },
};

function competitionTeamPath(
  organizationId: string,
  competitionId: string,
  teamId: string,
  resource: string,
): string {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/teams/${encodeURIComponent(teamId)}/${resource
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
