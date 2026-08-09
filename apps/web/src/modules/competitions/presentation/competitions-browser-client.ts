import {
  createCompetitionDraftRequestSchema,
  createCompetitionDraftResponseSchema,
  getCompetitionDraftResponseSchema,
  listOrganizationCompetitionsResponseSchema,
  listAccessibleCompetitionsResponseSchema,
  type CreateCompetitionDraftRequest,
  type CreateCompetitionDraftResponse,
  type GetCompetitionDraftResponse,
  type ListOrganizationCompetitionsResponse,
  type ListAccessibleCompetitionsResponse,
  updateCompetitionDraftRequestSchema,
  updateCompetitionDraftResponseSchema,
  competitionParticipantInputSchema,
  listCompetitionParticipantsResponseSchema,
  addCompetitionParticipantResponseSchema,
  publishCompetitionResponseSchema,
  listOrganizationTeamsResponseSchema,
  type UpdateCompetitionDraftRequest,
  type UpdateCompetitionDraftResponse,
  type CompetitionParticipantInput,
  type ListCompetitionParticipantsResponse,
  type AddCompetitionParticipantResponse,
  type PublishCompetitionResponse,
  type ListOrganizationTeamsResponse,
} from "@futrob/api-contracts";

export class CompetitionsClientError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "CompetitionsClientError";
  }
}

export async function listMyAccessibleCompetitions(): Promise<ListAccessibleCompetitionsResponse> {
  const response = await fetch("/api/v1/competitions/mine", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new CompetitionsClientError(errorCode(json, "competitions.mine_failed"));
  }
  return listAccessibleCompetitionsResponseSchema.parse(json);
}

export async function listOrganizationCompetitions(
  organizationId: string,
): Promise<ListOrganizationCompetitionsResponse> {
  const response = await fetch(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions`,
    { credentials: "include", headers: { Accept: "application/json" } },
  );
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new CompetitionsClientError(errorCode(json, "competitions.list_failed"));
  }
  return listOrganizationCompetitionsResponseSchema.parse(json);
}

export async function getCompetitionDraft(
  organizationId: string,
  competitionId: string,
): Promise<GetCompetitionDraftResponse> {
  const response = await fetch(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}`,
    { credentials: "include", headers: { Accept: "application/json" } },
  );
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new CompetitionsClientError(errorCode(json, "competitions.load_failed"));
  }
  return getCompetitionDraftResponseSchema.parse(json);
}

export async function createCompetitionDraft(
  organizationId: string,
  input: CreateCompetitionDraftRequest,
): Promise<CreateCompetitionDraftResponse> {
  const body = createCompetitionDraftRequestSchema.parse(input);
  const response = await fetch(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions`,
    {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new CompetitionsClientError(errorCode(json, "competitions.create_failed"));
  }
  return createCompetitionDraftResponseSchema.parse(json);
}

async function competitionRequest<T>(
  path: string,
  options: RequestInit,
  parse: (value: unknown) => T,
): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...options,
  });
  const json: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok)
    throw new CompetitionsClientError(errorCode(json, "competitions.request_failed"));
  return parse(json);
}

export function updateCompetitionDraft(
  organizationId: string,
  competitionId: string,
  input: UpdateCompetitionDraftRequest,
): Promise<UpdateCompetitionDraftResponse> {
  const body = updateCompetitionDraftRequestSchema.parse(input);
  return competitionRequest(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
    (value) => updateCompetitionDraftResponseSchema.parse(value),
  );
}

export function listCompetitionParticipants(
  organizationId: string,
  competitionId: string,
): Promise<ListCompetitionParticipantsResponse> {
  return competitionRequest(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/participants`,
    { method: "GET" },
    (value) => listCompetitionParticipantsResponseSchema.parse(value),
  );
}

export function listOrganizationTeams(
  organizationId: string,
): Promise<ListOrganizationTeamsResponse> {
  return competitionRequest(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/teams`,
    { method: "GET" },
    (value) => listOrganizationTeamsResponseSchema.parse(value),
  );
}

export function addCompetitionParticipant(
  organizationId: string,
  competitionId: string,
  input: CompetitionParticipantInput,
): Promise<AddCompetitionParticipantResponse> {
  const body = competitionParticipantInputSchema.parse(input);
  return competitionRequest(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/participants`,
    { method: "POST", body: JSON.stringify(body) },
    (value) => addCompetitionParticipantResponseSchema.parse(value),
  );
}

export function removeCompetitionParticipant(
  organizationId: string,
  competitionId: string,
  entryId: string,
): Promise<void> {
  return competitionRequest(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/participants/${encodeURIComponent(entryId)}`,
    { method: "DELETE" },
    () => undefined,
  );
}

export function publishCompetition(
  organizationId: string,
  competitionId: string,
): Promise<PublishCompetitionResponse> {
  return competitionRequest(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/publish`,
    { method: "POST" },
    (value) => publishCompetitionResponseSchema.parse(value),
  );
}

function errorCode(json: unknown, fallback: string): string {
  if (json && typeof json === "object" && "code" in json && typeof json.code === "string") {
    return json.code;
  }
  return fallback;
}
