import {
  createOrganizationRequestSchema,
  createOrganizationResponseSchema,
  createInvitationRequestSchema,
  createInvitationResponseSchema,
  acceptInvitationRequestSchema,
  acceptCompetitionInvitationResponseSchema,
  resolvePostAuthDestinationResponseSchema,
  listMyMembershipsResponseSchema,
  organizationNameAvailabilityRequestSchema,
  organizationNameAvailabilityResponseSchema,
  organizationProfileSchema,
  organizationSlugAvailabilityRequestSchema,
  organizationSlugAvailabilityResponseSchema,
  setOrganizationLogoRequestSchema,
  updateOrganizationProfileRequestSchema,
  type CreateOrganizationRequest,
  type CreateOrganizationResponse,
  type CreateInvitationRequest,
  type CreateInvitationResponse,
  type AcceptInvitationRequest,
  type AcceptCompetitionInvitationResponse,
  type ResolvePostAuthDestinationResponse,
  type ListMyMembershipsResponse,
  type OrganizationNameAvailabilityRequest,
  type OrganizationNameAvailabilityResponse,
  type OrganizationProfileDto,
  type OrganizationSlugAvailabilityRequest,
  type OrganizationSlugAvailabilityResponse,
  type PostAuthDestinationDto,
  type SetOrganizationLogoRequest,
  type UpdateOrganizationProfileRequest,
  type RequestId,
} from "@futrob/api-contracts";
import { z } from "zod";
import { readBrowserApiError } from "@/shared/infrastructure/http/browser-api-error.ts";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";

const uploadedLogoSchema = z.object({ key: z.string().min(1) });

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
  readonly method: "GET" | "POST" | "PATCH" | "PUT";
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

  checkNameAvailability(
    input: OrganizationNameAvailabilityRequest,
  ): Promise<OrganizationNameAvailabilityResponse> {
    const body = organizationNameAvailabilityRequestSchema.parse(input);
    return requestOrganizationsJson({
      path: "/api/v1/organizations/name-availability",
      method: "POST",
      body,
      schema: organizationNameAvailabilityResponseSchema,
    });
  },

  checkSlugAvailability(
    input: OrganizationSlugAvailabilityRequest,
  ): Promise<OrganizationSlugAvailabilityResponse> {
    const body = organizationSlugAvailabilityRequestSchema.parse(input);
    return requestOrganizationsJson({
      path: "/api/v1/organizations/slug-availability",
      method: "POST",
      body,
      schema: organizationSlugAvailabilityResponseSchema,
    });
  },

  getProfile(organizationId: string): Promise<OrganizationProfileDto> {
    return requestOrganizationsJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}`,
      method: "GET",
      schema: organizationProfileSchema,
    });
  },

  updateProfile(
    organizationId: string,
    input: UpdateOrganizationProfileRequest,
  ): Promise<OrganizationProfileDto> {
    const body = updateOrganizationProfileRequestSchema.parse(input);
    return requestOrganizationsJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}`,
      method: "PATCH",
      body,
      schema: organizationProfileSchema,
    });
  },

  setLogo(
    organizationId: string,
    input: SetOrganizationLogoRequest,
  ): Promise<OrganizationProfileDto> {
    const body = setOrganizationLogoRequestSchema.parse(input);
    return requestOrganizationsJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/logo`,
      method: "PUT",
      body,
      schema: organizationProfileSchema,
    });
  },

  /** PUT raw bytes; the Worker sniffs the type and stores under the organization's prefix. */
  async uploadLogo(
    organizationId: string,
    uploadKey: string,
    file: File,
  ): Promise<{ readonly key: string }> {
    const response = await fetch(
      `/api/v1/organizations/${encodeURIComponent(organizationId)}/logo/${encodeURIComponent(uploadKey)}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": file.type },
        body: file,
      },
    );
    const raw: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = readBrowserApiError(response, raw, "media.upload_failed");
      throw new OrganizationsClientError({
        status: response.status,
        code: error.code,
        message: error.code,
        requestId: error.requestId,
        retryAfterSeconds: error.retryAfterSeconds,
      });
    }
    return uploadedLogoSchema.parse(raw);
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
