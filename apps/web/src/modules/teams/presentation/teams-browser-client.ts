import {
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
  getMyPlayerProfileResponseSchema,
  getMyTeamsResponseSchema,
  setActiveTeamRequestSchema,
  setActiveTeamResponseSchema,
  type AddMyPlayerGameAccountRequest,
  type AddMyPlayerGameAccountResponse,
  type GetMyPlayerProfileResponse,
  type GetMyTeamsResponse,
  type SetActiveTeamRequest,
  type SetActiveTeamResponse,
} from "@futrob/api-contracts";

export class TeamsClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "TeamsClientError";
  }
}

async function requestJson<T>(input: {
  readonly path: string;
  readonly method: "GET" | "POST" | "PUT";
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
    const code =
      raw && typeof raw === "object" && "code" in raw && typeof raw.code === "string"
        ? raw.code
        : "teams.client_error";
    throw new TeamsClientError(response.status, code);
  }
  return input.parse(raw);
}

export const teamsBrowserClient = {
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
};
