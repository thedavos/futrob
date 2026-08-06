import {
  createCompetitionDraftRequestSchema,
  createCompetitionDraftResponseSchema,
  getCompetitionDraftResponseSchema,
  listOrganizationCompetitionsResponseSchema,
  type CreateCompetitionDraftRequest,
  type CreateCompetitionDraftResponse,
  type GetCompetitionDraftResponse,
  type ListOrganizationCompetitionsResponse,
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

function errorCode(json: unknown, fallback: string): string {
  if (json && typeof json === "object" && "code" in json && typeof json.code === "string") {
    return json.code;
  }
  return fallback;
}
