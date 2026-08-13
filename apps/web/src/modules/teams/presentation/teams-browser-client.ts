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
import { readBrowserApiError } from "@/shared/infrastructure/http/browser-api-error.ts";

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

async function requestJson<T>(input: {
  readonly path: string;
  readonly method: "GET" | "PATCH" | "POST" | "PUT";
  readonly body?: unknown;
  readonly parse: (data: unknown) => T;
}): Promise<T> {
  const response = await fetch(input.path, {
    method: input.method,
    credentials: "include",
    headers:
      input.body === undefined
        ? { Accept: "application/json" }
        : { Accept: "application/json", "Content-Type": "application/json" },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = readBrowserApiError(response, raw, "teams.client_error");
    throw new TeamsClientError(
      response.status,
      error.code,
      error.requestId,
      error.retryAfterSeconds,
    );
  }
  return input.parse(raw);
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
    return requestJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/team-management?${search.toString()}`,
      method: "GET",
      parse: (data) => competitionTeamManagementListResponseSchema.parse(data),
    });
  },
  getCompetitionTeamManagement(
    organizationId: string,
    competitionId: string,
    teamId: string,
  ): Promise<CompetitionTeamManagementDetailResponse> {
    return requestJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/team-management/${encodeURIComponent(teamId)}`,
      method: "GET",
      parse: (data) => competitionTeamManagementDetailResponseSchema.parse(data),
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
    return requestJson({
      path: competitionTeamPath(organizationId, competitionId, teamId, `roster/${membershipId}`),
      method: "PATCH",
      body,
      parse: (data) => changeRosterRoleResponseSchema.parse(data),
    });
  },
  closeRoster(
    organizationId: string,
    competitionId: string,
    teamId: string,
  ): Promise<CloseRosterResponse> {
    return requestJson({
      path: competitionTeamPath(organizationId, competitionId, teamId, "roster/close"),
      method: "POST",
      parse: (data) => closeRosterResponseSchema.parse(data),
    });
  },
  openRoster(
    organizationId: string,
    competitionId: string,
    teamId: string,
  ): Promise<OpenRosterResponse> {
    return requestJson({
      path: competitionTeamPath(organizationId, competitionId, teamId, "roster/open"),
      method: "POST",
      parse: (data) => openRosterResponseSchema.parse(data),
    });
  },
  connectExternalClub(
    organizationId: string,
    competitionId: string,
    teamId: string,
    input: ConnectTeamExternalClubRequest,
  ): Promise<ConnectTeamExternalClubResponse> {
    const body = connectTeamExternalClubRequestSchema.parse(input);
    return requestJson({
      path: competitionTeamPath(organizationId, competitionId, teamId, "external-club"),
      method: "PUT",
      body,
      parse: (data) => connectTeamExternalClubResponseSchema.parse(data),
    });
  },
  createRosterInvitation(
    organizationId: string,
    competitionId: string,
    teamId: string,
    input: CreateRosterInvitationRequestInput,
  ): Promise<CreateRosterInvitationResponse> {
    const body = createRosterInvitationRequestSchema.parse(input);
    return requestJson({
      path: competitionTeamPath(organizationId, competitionId, teamId, "roster-invitations"),
      method: "POST",
      body,
      parse: (data) => createRosterInvitationResponseSchema.parse(data),
    });
  },
  decideEntry(
    organizationId: string,
    competitionId: string,
    entryId: string,
    decision: "approve" | "reject",
  ): Promise<DecideTeamEntryResponse> {
    return requestJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/entries/${encodeURIComponent(entryId)}/${decision}`,
      method: "POST",
      parse: (data) => decideTeamEntryResponseSchema.parse(data),
    });
  },
  getMyProfile(): Promise<GetMyPlayerProfileResponse> {
    return requestJson({
      path: "/api/v1/players/me",
      method: "GET",
      parse: (data) => getMyPlayerProfileResponseSchema.parse(data),
    });
  },
  addMyGameAccount(input: AddMyPlayerGameAccountRequest): Promise<AddMyPlayerGameAccountResponse> {
    const body = addMyPlayerGameAccountRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/players/me/game-accounts",
      method: "POST",
      body,
      parse: (data) => addMyPlayerGameAccountResponseSchema.parse(data),
    });
  },
  associateMyExternalClub(
    input: AssociateMyPlayerExternalClubRequest,
  ): Promise<AssociateMyPlayerExternalClubResponse> {
    const body = associateMyPlayerExternalClubRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/players/me/external-club",
      method: "POST",
      body,
      parse: (data) => associateMyPlayerExternalClubResponseSchema.parse(data),
    });
  },
  getMyTeams(): Promise<GetMyTeamsResponse> {
    return requestJson({
      path: "/api/v1/players/me/teams",
      method: "GET",
      parse: (data) => getMyTeamsResponseSchema.parse(data),
    });
  },
  setActiveTeam(input: SetActiveTeamRequest): Promise<SetActiveTeamResponse> {
    const body = setActiveTeamRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/players/me/active-team",
      method: "PUT",
      body,
      parse: (data) => setActiveTeamResponseSchema.parse(data),
    });
  },
  acceptRosterInvitation(
    input: AcceptRosterInvitationRequest,
  ): Promise<AcceptRosterInvitationResponse> {
    const body = acceptRosterInvitationRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/roster-invitations/accept",
      method: "POST",
      body,
      parse: (data) => acceptRosterInvitationResponseSchema.parse(data),
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
