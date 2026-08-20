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
import type { z } from "zod";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";

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

async function requestOrganizationsJson<T>(input: {
  readonly path: string;
  readonly method: "GET" | "POST";
  readonly body?: unknown;
  readonly schema: z.ZodType<T>;
}): Promise<T> {
  return requestBrowserJson({
    path: input.path,
    method: input.method,
    body: input.body,
    schema: input.schema,
    fallbackCode: "organizations.client_error",
    createError: (status, error) =>
      new OrganizationsClientError({
        status,
        code: error.code,
        message: error.code,
        requestId: error.requestId,
        retryAfterSeconds: error.retryAfterSeconds,
      }),
  });
}

/** Browser client for same-origin organizations BFF (session cookies). */
export const organizationsBrowserClient = {
  listMine(): Promise<ListMyMembershipsResponse> {
    return requestOrganizationsJson({
      path: "/api/v1/organizations/mine",
      method: "GET",
      schema: listMyMembershipsResponseSchema,
    });
  },

  resolvePostAuthDestination(): Promise<ResolvePostAuthDestinationResponse> {
    return requestOrganizationsJson({
      path: "/api/v1/organizations/post-auth-destination",
      method: "GET",
      schema: resolvePostAuthDestinationResponseSchema,
    });
  },

  create(input: CreateOrganizationRequest): Promise<CreateOrganizationResponse> {
    const body = createOrganizationRequestSchema.parse(input);
    return requestOrganizationsJson({
      path: "/api/v1/organizations/",
      method: "POST",
      body,
      schema: createOrganizationResponseSchema,
    });
  },

  acceptInvitation(input: AcceptInvitationRequest): Promise<AcceptCompetitionInvitationResponse> {
    const body = acceptInvitationRequestSchema.parse(input);
    return requestOrganizationsJson({
      path: "/api/v1/competitions/invitations/accept",
      method: "POST",
      body,
      schema: acceptCompetitionInvitationResponseSchema,
    });
  },

  createCompetitionInvitation(
    organizationId: string,
    competitionId: string,
    input: CreateInvitationRequest,
  ): Promise<CreateInvitationResponse> {
    const body = createInvitationRequestSchema.parse(input);
    return requestOrganizationsJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/invitations`,
      method: "POST",
      body,
      schema: createInvitationResponseSchema,
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
