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
import { z } from "zod";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";
import type { UnparsedResponseBody } from "@/shared/infrastructure/http/browser-api-error.ts";

export class CompetitionsClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "CompetitionsClientError";
  }
}

function createCompetitionsError(status: number, code: string): CompetitionsClientError {
  return new CompetitionsClientError(status, code);
}

async function requestCompetitionsJson<T>(input: {
  readonly path: string;
  readonly method: "GET" | "PATCH" | "POST" | "DELETE";
  readonly body?: unknown;
  readonly schema: z.ZodType<T>;
  readonly fallbackCode: string;
}): Promise<T> {
  return requestBrowserJson({
    path: input.path,
    method: input.method,
    body: input.body,
    schema: input.schema,
    fallbackCode: input.fallbackCode,
    createError: (status, error) => createCompetitionsError(status, error.code),
  });
}

function competitionJsonHeaders(hasBody: boolean): HeadersInit {
  if (hasBody) {
    return { Accept: "application/json", "Content-Type": "application/json" };
  }
  return { Accept: "application/json" };
}

async function competitionRequest<T>(
  path: string,
  options: { readonly method: "GET" | "PATCH" | "POST" | "DELETE"; readonly body?: unknown },
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(path, {
    method: options.method,
    credentials: "include",
    headers: competitionJsonHeaders(options.body !== undefined),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const raw: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw createCompetitionsError(response.status, errorCode(raw, "competitions.request_failed"));
  }
  return schema.parse(raw);
}

export async function listMyAccessibleCompetitions(): Promise<ListAccessibleCompetitionsResponse> {
  return requestCompetitionsJson({
    path: "/api/v1/competitions/mine",
    method: "GET",
    schema: listAccessibleCompetitionsResponseSchema,
    fallbackCode: "competitions.mine_failed",
  });
}

export async function listOrganizationCompetitions(
  organizationId: string,
): Promise<ListOrganizationCompetitionsResponse> {
  return requestCompetitionsJson({
    path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions`,
    method: "GET",
    schema: listOrganizationCompetitionsResponseSchema,
    fallbackCode: "competitions.list_failed",
  });
}

export async function getCompetitionDraft(
  organizationId: string,
  competitionId: string,
): Promise<GetCompetitionDraftResponse> {
  return requestCompetitionsJson({
    path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}`,
    method: "GET",
    schema: getCompetitionDraftResponseSchema,
    fallbackCode: "competitions.load_failed",
  });
}

export async function createCompetitionDraft(
  organizationId: string,
  input: CreateCompetitionDraftRequest,
): Promise<CreateCompetitionDraftResponse> {
  const body = createCompetitionDraftRequestSchema.parse(input);
  return requestCompetitionsJson({
    path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions`,
    method: "POST",
    body,
    schema: createCompetitionDraftResponseSchema,
    fallbackCode: "competitions.create_failed",
  });
}

export function updateCompetitionDraft(
  organizationId: string,
  competitionId: string,
  input: UpdateCompetitionDraftRequest,
): Promise<UpdateCompetitionDraftResponse> {
  const body = updateCompetitionDraftRequestSchema.parse(input);
  return competitionRequest(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}`,
    { method: "PATCH", body },
    updateCompetitionDraftResponseSchema,
  );
}

export function listCompetitionParticipants(
  organizationId: string,
  competitionId: string,
): Promise<ListCompetitionParticipantsResponse> {
  return competitionRequest(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/participants`,
    { method: "GET" },
    listCompetitionParticipantsResponseSchema,
  );
}

export function listOrganizationTeams(
  organizationId: string,
): Promise<ListOrganizationTeamsResponse> {
  return competitionRequest(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/teams`,
    { method: "GET" },
    listOrganizationTeamsResponseSchema,
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
    { method: "POST", body },
    addCompetitionParticipantResponseSchema,
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
    z.null().transform(() => undefined),
  );
}

export function publishCompetition(
  organizationId: string,
  competitionId: string,
): Promise<PublishCompetitionResponse> {
  return competitionRequest(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/publish`,
    { method: "POST" },
    publishCompetitionResponseSchema,
  );
}

const errorBodySchema = z.object({ code: z.string() });

function errorCode(raw: UnparsedResponseBody, fallback: string): string {
  const parsed = errorBodySchema.safeParse(raw);
  return parsed.success ? parsed.data.code : fallback;
}
