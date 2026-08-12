import {
  createOrganizationRequestSchema,
  createOrganizationResponseSchema,
  createInvitationRequestSchema,
  createInvitationResponseSchema,
  acceptInvitationRequestSchema,
  acceptCompetitionInvitationResponseSchema,
  resolvePostAuthDestinationResponseSchema,
  listMyMembershipsResponseSchema,
  type CreateOrganizationRequest,
  type CreateOrganizationResponse,
  type CreateInvitationRequest,
  type CreateInvitationResponse,
  type AcceptInvitationRequest,
  type AcceptCompetitionInvitationResponse,
  type ResolvePostAuthDestinationResponse,
  type ListMyMembershipsResponse,
  type PostAuthDestinationDto,
  type RequestId,
} from "@futrob/api-contracts";
import { readBrowserApiError } from "@/shared/infrastructure/http/browser-api-error.ts";

async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export class OrganizationsClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: RequestId;
  readonly retryAfterSeconds?: number;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    requestId?: RequestId;
    retryAfterSeconds?: number;
  }) {
    super(input.message);
    this.name = "OrganizationsClientError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.retryAfterSeconds = input.retryAfterSeconds;
  }
}

async function requestJson<T>(input: {
  readonly path: string;
  readonly method: "GET" | "POST";
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

  const raw = await parseJson(response);
  if (!response.ok) {
    const error = readBrowserApiError(response, raw, "organizations.client_error");
    throw new OrganizationsClientError({
      status: response.status,
      code: error.code,
      message: error.code,
      requestId: error.requestId,
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }

  return input.parse(raw);
}

/** Browser client for same-origin organizations BFF (session cookies). */
export const organizationsBrowserClient = {
  listMine(): Promise<ListMyMembershipsResponse> {
    return requestJson({
      path: "/api/v1/organizations/mine",
      method: "GET",
      parse: (data) => listMyMembershipsResponseSchema.parse(data),
    });
  },

  resolvePostAuthDestination(): Promise<ResolvePostAuthDestinationResponse> {
    return requestJson({
      path: "/api/v1/organizations/post-auth-destination",
      method: "GET",
      parse: (data) => resolvePostAuthDestinationResponseSchema.parse(data),
    });
  },

  create(input: CreateOrganizationRequest): Promise<CreateOrganizationResponse> {
    const body = createOrganizationRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/organizations/",
      method: "POST",
      body,
      parse: (data) => createOrganizationResponseSchema.parse(data),
    });
  },

  acceptInvitation(input: AcceptInvitationRequest): Promise<AcceptCompetitionInvitationResponse> {
    const body = acceptInvitationRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/competitions/invitations/accept",
      method: "POST",
      body,
      parse: (data) => acceptCompetitionInvitationResponseSchema.parse(data),
    });
  },

  createCompetitionInvitation(
    organizationId: string,
    competitionId: string,
    input: CreateInvitationRequest,
  ): Promise<CreateInvitationResponse> {
    const body = createInvitationRequestSchema.parse(input);
    return requestJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/invitations`,
      method: "POST",
      body,
      parse: (data) => createInvitationResponseSchema.parse(data),
    });
  },
};

export function pathForPostAuthDestination(destination: PostAuthDestinationDto): string {
  switch (destination.kind) {
    case "onboarding":
      return "/onboarding";
    case "personal":
      return "/player";
    case "organization":
      return `/orgs/${destination.organizationId}`;
    case "organizationPicker":
      return "/orgs";
  }
}
